import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  findAll() {
    return this.rolesRepo.find({
      order: { name: 'ASC' },
      relations: {
        rolePermissions: { permission: true },
      },
    });
  }

  findByCode(code: string) {
    return this.rolesRepo.findOne({ where: { code } });
  }
}
