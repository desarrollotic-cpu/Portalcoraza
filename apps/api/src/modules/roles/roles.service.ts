import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionsRepo: Repository<RolePermission>,
    @InjectRepository(Permission)
    private readonly permissionsRepo: Repository<Permission>,
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

  async setPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.rolesRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (permissionIds.length > 0) {
      const permissions = await this.permissionsRepo.find({
        where: { id: In(permissionIds) },
      });
      if (permissions.length !== permissionIds.length) {
        throw new NotFoundException('Uno o más permisos no existen');
      }
    }

    await this.rolePermissionsRepo.delete({ roleId });
    if (permissionIds.length > 0) {
      await this.rolePermissionsRepo.save(
        permissionIds.map((permissionId) => ({ roleId, permissionId })),
      );
    }

    return this.rolesRepo.findOne({
      where: { id: roleId },
      relations: { rolePermissions: { permission: true } },
    });
  }
}
