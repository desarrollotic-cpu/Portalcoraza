import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: {
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    if (!user?.role?.rolePermissions) {
      return [];
    }

    return user.role.rolePermissions.map((rp) => rp.permission.code);
  }
}
