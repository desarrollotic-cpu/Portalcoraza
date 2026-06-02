import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.postsRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('Puesto no encontrado');
    }
    return post;
  }

  async create(dto: CreatePostDto, userId: string) {
    const post = this.postsRepo.create(dto);
    const saved = await this.postsRepo.save(post);

    await this.auditService.log({
      userId,
      module: 'posts',
      action: 'create',
      entityType: 'post',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const existing = await this.findOne(id);
    const oldSnapshot = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.postsRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'posts',
      action: 'update',
      entityType: 'post',
      entityId: id,
      oldValue: oldSnapshot as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }
}
