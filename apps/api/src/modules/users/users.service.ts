import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Post } from '../posts/entities/post.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
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

  updateLastLogin(id: string) {
    return this.usersRepo.update(id, { lastLoginAt: new Date() });
  }

  findAll() {
    return this.usersRepo.find({
      relations: { role: true },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { id: true, code: true, name: true },
      },
    });
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

    const { passwordHash: _, ...safe } = user;
    return safe;
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
