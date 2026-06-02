import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
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
}
