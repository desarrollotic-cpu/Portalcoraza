import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { PostsService } from '../posts/posts.service';
import { CreateWorkCenterDto } from './dto/create-work-center.dto';
import { UpdateWorkCenterDto } from './dto/update-work-center.dto';
import { WorkCenter } from './entities/work-center.entity';

@Injectable()
export class HrWorkCentersService {
  constructor(
    @InjectRepository(WorkCenter)
    private readonly repo: Repository<WorkCenter>,
    private readonly audit: AuditService,
    private readonly postsService: PostsService,
  ) {}

  findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.repo.find({ where, order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const wc = await this.repo.findOne({ where: { id } });
    if (!wc) throw new NotFoundException('Centro de trabajo no encontrado');
    return wc;
  }

  async create(dto: CreateWorkCenterDto, userId: string) {
    const code = dto.code.trim();
    const exists = await this.repo.findOne({ where: { code } });
    if (exists) throw new ConflictException(`El centro de trabajo con código "${code}" ya existe`);

    const wc = this.repo.create({
      code,
      clientName: dto.clientName.trim(),
      address: dto.address ?? null,
      zone: dto.zone ?? null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(wc);
    await this.postsService.syncFromWorkCenter(saved, userId);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'create',
      entityType: 'work_center',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async update(id: string, dto: UpdateWorkCenterDto, userId: string) {
    const wc = await this.findOne(id);
    const oldSnapshot = { ...wc };

    if (dto.code) wc.code = dto.code.trim();
    if (dto.clientName) wc.clientName = dto.clientName.trim();
    if (dto.address !== undefined) wc.address = dto.address ?? null;
    if (dto.zone !== undefined) wc.zone = dto.zone ?? null;
    if (dto.notes !== undefined) wc.notes = dto.notes ?? null;
    if (dto.isActive !== undefined) wc.isActive = dto.isActive;

    const saved = await this.repo.save(wc);
    await this.postsService.syncFromWorkCenter(saved, userId);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'update',
      entityType: 'work_center',
      entityId: id,
      oldValue: oldSnapshot as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  /** Sincroniza todos los centros existentes hacia puestos de Programación. */
  async syncAllPosts(userId?: string) {
    const centers = await this.repo.find({ order: { code: 'ASC' } });
    const posts = [];
    for (const wc of centers) {
      posts.push(await this.postsService.syncFromWorkCenter(wc, userId));
    }
    return { synced: posts.length, posts };
  }
}
