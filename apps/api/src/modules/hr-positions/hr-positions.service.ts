import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateJobPositionDto } from './dto/create-job-position.dto';
import { UpdateJobPositionDto } from './dto/update-job-position.dto';
import { JobPosition } from './entities/job-position.entity';

@Injectable()
export class HrPositionsService {
  constructor(
    @InjectRepository(JobPosition)
    private readonly repo: Repository<JobPosition>,
    private readonly audit: AuditService,
  ) {}

  findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.repo.find({ where, order: { isCritical: 'DESC', name: 'ASC' } });
  }

  async findOne(id: string) {
    const position = await this.repo.findOne({ where: { id } });
    if (!position) throw new NotFoundException('Cargo no encontrado');
    return position;
  }

  async create(dto: CreateJobPositionDto, userId: string) {
    const name = dto.name.trim().toUpperCase();
    const exists = await this.repo.findOne({ where: { name } });
    if (exists) throw new ConflictException(`El cargo "${name}" ya existe`);

    const position = this.repo.create({
      name,
      isCritical: dto.isCritical ?? false,
      refreshFrequencyYears: dto.refreshFrequencyYears ?? 2,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(position);

    await this.audit.log({
      userId,
      module: 'hr',
      action: 'create',
      entityType: 'job_position',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async update(id: string, dto: UpdateJobPositionDto, userId: string) {
    const position = await this.findOne(id);
    const oldSnapshot = { ...position };

    if (dto.name) position.name = dto.name.trim().toUpperCase();
    if (dto.isCritical !== undefined) position.isCritical = dto.isCritical;
    if (dto.refreshFrequencyYears !== undefined) position.refreshFrequencyYears = dto.refreshFrequencyYears;
    if (dto.description !== undefined) position.description = dto.description ?? null;
    if (dto.isActive !== undefined) position.isActive = dto.isActive;

    const saved = await this.repo.save(position);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'update',
      entityType: 'job_position',
      entityId: id,
      oldValue: oldSnapshot as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }
}
