import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
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
}
