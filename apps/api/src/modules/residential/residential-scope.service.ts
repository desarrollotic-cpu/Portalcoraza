import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserPost } from '../users/entities/user-post.entity';
import { ResidentialUnit } from './entities/residential-unit.entity';

@Injectable()
export class ResidentialScopeService {
  constructor(
    @InjectRepository(UserPost)
    private readonly userPostsRepo: Repository<UserPost>,
    @InjectRepository(ResidentialUnit)
    private readonly unitsRepo: Repository<ResidentialUnit>,
  ) {}

  async getPostIdsForUser(user: JwtPayload): Promise<string[] | null> {
    if (user.roleCode === 'GERENCIA') {
      return null;
    }

    const assignments = await this.userPostsRepo.find({
      where: { userId: user.sub },
    });

    return assignments.map((a) => a.postId);
  }

  applyPostFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    postIds: string[] | null,
  ): SelectQueryBuilder<T> {
    if (postIds === null) {
      return qb;
    }

    if (postIds.length === 0) {
      return qb.andWhere('1 = 0');
    }

    return qb.andWhere(`${alias}.post_id IN (:...postIds)`, { postIds });
  }

  async assertUnitAccess(unitId: string, user: JwtPayload): Promise<ResidentialUnit> {
    const unit = await this.unitsRepo.findOne({ where: { id: unitId } });
    if (!unit) {
      throw new NotFoundException('Unidad residencial no encontrada');
    }

    const postIds = await this.getPostIdsForUser(user);
    if (postIds !== null && !postIds.includes(unit.postId)) {
      throw new ForbiddenException('Sin acceso a esta unidad residencial');
    }

    return unit;
  }

  async getAccessibleUnitIds(user: JwtPayload): Promise<string[] | null> {
    const postIds = await this.getPostIdsForUser(user);
    if (postIds === null) {
      return null;
    }

    if (postIds.length === 0) {
      return [];
    }

    const units = await this.unitsRepo.find({
      where: postIds.map((postId) => ({ postId })),
      select: { id: true },
    });

    return units.map((u) => u.id);
  }
}
