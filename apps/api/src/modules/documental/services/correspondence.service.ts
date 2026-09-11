import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateCorrespondenceDto } from '../dto/create-correspondence.dto';
import { Correspondence } from '../entities/correspondence.entity';
import { SequenceService } from './sequence.service';

@Injectable()
export class CorrespondenceService {
  constructor(
    @InjectRepository(Correspondence)
    private readonly repo: Repository<Correspondence>,
    private readonly sequence: SequenceService,
    private readonly audit: AuditService,
  ) {}

  list(q?: string) {
    const clean = (q || '').replace(/^#/, '').trim().replace(/[%_]/g, '');
    const qb = this.repo.createQueryBuilder('c');
    if (clean) {
      qb.where(
        `(c.document_code ILIKE :q OR c.subject ILIKE :q OR c.detail ILIKE :q
          OR c.origin_dept ILIKE :q OR c.destination_dept ILIKE :q
          OR c.document_type ILIKE :q OR CAST(c.numeric_code AS text) ILIKE :q
          OR c.voxelsera ILIKE :q)`,
        { q: `%${clean}%` },
      );
    }
    return qb.orderBy('c.created_at', 'DESC').take(80).getMany();
  }

  /** Radicado TRD: {depCode}-{serieCode}[.{subserieCode}]-{año}-{0000}. Peek = no quema consecutivo. */
  async previewCode(
    depSigla: string,
    depCode: string,
    serieCode: string,
    subserieCode?: string,
  ): Promise<{ code: string; numeric: number }> {
    const year = new Date().getFullYear();
    const sub = subserieCode ? `.${subserieCode}` : '';
    const scope = `correspondence:${(depSigla || depCode).toUpperCase()}`;
    const numeric = await this.sequence.peek(scope);
    return {
      code: `${depCode}-${serieCode}${sub}-${year}-${String(numeric).padStart(4, '0')}`,
      numeric,
    };
  }

  async create(dto: CreateCorrespondenceDto, userId: string) {
    // Siempre consume el contador al crear (el peek solo sirve de placeholder en UI).
    // Ignorar documentCode del cliente evita radicados duplicados si reenvían el preview.
    const year = new Date().getFullYear();
    const depCode = dto.depCode ?? dto.originDept;
    const serieCode = dto.serieCode ?? '00';
    const sub = dto.subserieCode ? `.${dto.subserieCode}` : '';
    const scope = `correspondence:${(dto.originDept || depCode).toUpperCase()}`;
    const numeric = await this.sequence.next(scope);
    const code = `${depCode}-${serieCode}${sub}-${year}-${String(numeric).padStart(4, '0')}`;

    const saved = await this.repo.save(
      this.repo.create({
        documentCode: code,
        numericCode: numeric,
        documentDate: dto.documentDate ?? null,
        medium: dto.medium ?? null,
        documentType: dto.documentType ?? null,
        originDept: dto.originDept,
        destinationDept: dto.destinationDept ?? null,
        subject: dto.subject ?? null,
        detail: dto.detail ?? null,
        status: dto.status ?? 'PENDIENTE',
        voxelsera: dto.voxelsera ?? null,
        registeredBy: userId,
      }),
    );

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'correspondence.create',
      entityType: 'doc_correspondence',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }
}
