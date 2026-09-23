import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { applyLockedPatch } from '../documental-edit';
import { CreateMinuteDto } from '../dto/create-minute.dto';
import { UpdateMinuteDto } from '../dto/update-minute.dto';
import { Minute } from '../entities/minute.entity';
import { SequenceService } from './sequence.service';

const PREFIX: Record<string, string> = {
  VISITANTES: 'VIS',
  CORRESPONDENCIA: 'COR',
  SERVICIO: 'SER',
};

@Injectable()
export class MinutesService {
  constructor(
    @InjectRepository(Minute)
    private readonly repo: Repository<Minute>,
    private readonly sequence: SequenceService,
    private readonly audit: AuditService,
  ) {}

  list(q?: string) {
    const clean = (q || '').replace(/^#/, '').trim().replace(/[%_]/g, '');
    const qb = this.repo.createQueryBuilder('m');
    if (clean) {
      qb.where(
        `(m.unique_code ILIKE :q OR m.post_name ILIKE :q OR m.minute_type ILIKE :q
          OR CAST(m.numeric_code AS text) ILIKE :q OR m.voxelsera ILIKE :q)`,
        { q: `%${clean}%` },
      );
    }
    return qb.orderBy('m.numeric_code', 'DESC').take(80).getMany();
  }

  /** Código: MIN-{SER|VIS|COR}-####, consecutivo por tipo de minuta. */
  async create(dto: CreateMinuteDto, userId: string) {
    const prefix = PREFIX[dto.minuteType] ?? 'SER';
    const numeric = await this.sequence.next(`minute:${dto.minuteType}`);
    const uniqueCode = `MIN-${prefix}-${String(numeric).padStart(4, '0')}`;

    const saved = await this.repo.save(
      this.repo.create({
        minuteType: dto.minuteType,
        postName: dto.postName ?? null,
        startDate: dto.startDate ?? null,
        closeDate: dto.closeDate ?? null,
        observations: dto.observations ?? null,
        status: 'ACTIVO',
        uniqueCode,
        numericCode: numeric,
        voxelsera: dto.voxelsera ?? null,
        responsible: userId,
      }),
    );

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'minute.create',
      entityType: 'doc_minutes',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async update(id: string, dto: UpdateMinuteDto, userId: string) {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('Minuta no encontrada');
    const oldValue = { ...existing };
    applyLockedPatch(existing, dto as Partial<Minute>, {
      uniqueCode: existing.uniqueCode,
      numericCode: existing.numericCode,
      minuteType: existing.minuteType,
      id: existing.id,
      tenantId: existing.tenantId,
    });
    const saved = await this.repo.save(existing);
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'minute.update',
      entityType: 'doc_minutes',
      entityId: saved.id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }
}
