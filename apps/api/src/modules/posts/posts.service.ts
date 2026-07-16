import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { WorkCenter } from '../hr-work-centers/entities/work-center.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post, PostStatus, PostType } from './entities/post.entity';

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

  /**
   * Mantiene el puesto de Programación alineado con un centro de trabajo RRHH.
   * Si no existe, lo crea; si existe (por work_center_id o código), lo actualiza.
   */
  async syncFromWorkCenter(wc: WorkCenter, userId?: string): Promise<Post> {
    const name = (wc.clientName?.trim() || wc.code).slice(0, 200);
    const status = wc.isActive ? PostStatus.ACTIVO : PostStatus.INACTIVO;

    let post =
      (await this.postsRepo.findOne({ where: { workCenterId: wc.id } })) ??
      (await this.postsRepo.findOne({ where: { code: wc.code } }));

    if (!post) {
      post = this.postsRepo.create({
        code: wc.code.slice(0, 50),
        name,
        type: PostType.SERVICIO_ESPECIAL,
        status,
        address: wc.address,
        clientName: wc.clientName,
        notes: wc.notes,
        workCenterId: wc.id,
      });
      const saved = await this.postsRepo.save(post);
      if (userId) {
        await this.auditService.log({
          userId,
          module: 'posts',
          action: 'create',
          entityType: 'post',
          entityId: saved.id,
          newValue: {
            ...saved,
            syncedFrom: 'work_center',
          } as unknown as Record<string, unknown>,
        });
      }
      return saved;
    }

    const oldSnapshot = { ...post };
    post.code = wc.code.slice(0, 50);
    post.name = name;
    post.status = status;
    post.address = wc.address;
    post.clientName = wc.clientName;
    post.notes = wc.notes;
    post.workCenterId = wc.id;
    const saved = await this.postsRepo.save(post);

    if (userId) {
      await this.auditService.log({
        userId,
        module: 'posts',
        action: 'update',
        entityType: 'post',
        entityId: saved.id,
        oldValue: oldSnapshot as unknown as Record<string, unknown>,
        newValue: {
          ...saved,
          syncedFrom: 'work_center',
        } as unknown as Record<string, unknown>,
      });
    }

    return saved;
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
