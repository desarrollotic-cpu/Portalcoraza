import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Post } from '../posts/entities/post.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPost } from './entities/user-post.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    @InjectRepository(UserPost)
    private readonly userPostsRepo: Repository<UserPost>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    private readonly auditService: AuditService,
  ) {}

  findById(id: string) {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByEmailWithRole(email: string) {
    return this.usersRepo.findOne({
      where: { email: email.toLowerCase() },
      relations: { role: true },
    });
  }

  findGerenciaAdmin() {
    return this.usersRepo
      .createQueryBuilder('u')
      .innerJoinAndSelect('u.role', 'role')
      .where('role.code = :code', { code: 'GERENCIA' })
      .andWhere('u.isActive = true')
      .orderBy('u.createdAt', 'ASC')
      .getOne();
  }

  updateLastLogin(id: string) {
    return this.usersRepo.update(id, { lastLoginAt: new Date() });
  }

  async changeOwnPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user?.isActive) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser distinta a la actual');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.save(user);

    await this.auditService.log({
      userId,
      module: 'auth',
      action: 'change_password',
      entityType: 'user',
      entityId: userId,
    });

    return { ok: true };
  }

  async resetPasswordByAdmin(targetUserId: string, newPassword: string, actorUserId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: targetUserId },
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    user.passwordHash = await bcrypt.hash(newPassword.trim(), 12);
    await this.usersRepo.save(user);
    await this.refreshRepo.update(
      { userId: targetUserId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    await this.auditService.log({
      userId: actorUserId,
      module: 'users',
      action: 'reset_password',
      entityType: 'user',
      entityId: targetUserId,
      newValue: { email: user.email, resetByAdmin: true },
    });

    return { ok: true, email: user.email };
  }

  async setPasswordHash(userId: string, passwordHash: string) {
    await this.usersRepo.update({ id: userId }, { passwordHash });
  }

  private userListSelect = {
    id: true,
    email: true,
    fullName: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    role: { id: true, code: true, name: true },
  } as const;

  findAll() {
    return this.usersRepo.find({
      relations: { role: true },
      order: { createdAt: 'DESC' },
      select: this.userListSelect,
    });
  }

  private async findOneForAdmin(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: { role: true },
      select: this.userListSelect,
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async create(dto: CreateUserDto, createdByUserId: string) {
    const email = dto.email.toLowerCase();
    const exists = await this.usersRepo.findOne({ where: { email } });
    if (exists) {
      throw new ConflictException('El correo ya está registrado');
    }

    const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email,
        passwordHash,
        fullName: dto.fullName ?? null,
        roleId: dto.roleId,
        isActive: true,
      }),
    );

    await this.auditService.log({
      userId: createdByUserId,
      module: 'users',
      action: 'create',
      entityType: 'user',
      entityId: user.id,
      newValue: {
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
      },
    });

    return this.findOneForAdmin(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorUserId: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const oldSnapshot = {
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      isActive: user.isActive,
    };

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const conflict = await this.usersRepo.findOne({ where: { email } });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('El correo ya está registrado');
      }
      user.email = email;
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName?.trim() ? dto.fullName.trim() : null;
    }

    if (dto.roleId !== undefined) {
      const role = await this.rolesRepo.findOne({ where: { id: dto.roleId } });
      if (!role) {
        throw new NotFoundException('Rol no encontrado');
      }
      user.roleId = dto.roleId;
    }

    if (dto.isActive !== undefined) {
      if (id === actorUserId && dto.isActive === false) {
        throw new BadRequestException('No puedes desactivar tu propio usuario');
      }
      user.isActive = dto.isActive;
    }

    if (dto.password !== undefined && dto.password.trim().length > 0) {
      user.passwordHash = await bcrypt.hash(dto.password.trim(), 12);
    }

    await this.usersRepo.save(user);

    await this.auditService.log({
      userId: actorUserId,
      module: 'users',
      action: 'update',
      entityType: 'user',
      entityId: id,
      oldValue: oldSnapshot,
      newValue: {
        email: user.email,
        fullName: user.fullName,
        roleId: user.roleId,
        isActive: user.isActive,
        passwordChanged: Boolean(dto.password?.trim()),
      },
    });

    return this.findOneForAdmin(id);
  }

  async remove(id: string, actorUserId: string) {
    if (id === actorUserId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }

    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Soft-delete: desactiva el acceso (conserva historial / FKs)
    user.isActive = false;
    await this.usersRepo.save(user);

    await this.auditService.log({
      userId: actorUserId,
      module: 'users',
      action: 'deactivate',
      entityType: 'user',
      entityId: id,
      oldValue: { email: user.email, isActive: true },
      newValue: { email: user.email, isActive: false },
    });

    return this.findOneForAdmin(id);
  }

  async listAssignedPosts(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const assignments = await this.userPostsRepo.find({
      where: { userId },
      relations: { post: true },
      order: { assignedAt: 'DESC' },
    });

    return assignments.map((a) => ({
      postId: a.postId,
      assignedAt: a.assignedAt,
      post: {
        id: a.post.id,
        code: a.post.code,
        name: a.post.name,
        type: a.post.type,
        status: a.post.status,
      },
    }));
  }

  async assignPost(userId: string, postId: string, assignedByUserId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Puesto no encontrado');
    }

    const exists = await this.userPostsRepo.findOne({ where: { userId, postId } });
    if (!exists) {
      await this.userPostsRepo.save(this.userPostsRepo.create({ userId, postId }));

      await this.auditService.log({
        userId: assignedByUserId,
        module: 'users',
        action: 'assign_post',
        entityType: 'user',
        entityId: userId,
        newValue: { postId },
      });
    }

    return this.listAssignedPosts(userId);
  }

  async removeAssignedPost(userId: string, postId: string, removedByUserId: string) {
    const assignment = await this.userPostsRepo.findOne({ where: { userId, postId } });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    await this.userPostsRepo.delete({ userId, postId });

    await this.auditService.log({
      userId: removedByUserId,
      module: 'users',
      action: 'remove_post',
      entityType: 'user',
      entityId: userId,
      oldValue: { postId },
    });

    return { success: true };
  }
}
