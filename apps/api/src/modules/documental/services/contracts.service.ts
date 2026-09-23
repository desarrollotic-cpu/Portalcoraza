import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { applyLockedPatch } from '../documental-edit';
import { CreateContractDto } from '../dto/create-contract.dto';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { Contract } from '../entities/contract.entity';
import { Workflow } from '../entities/workflow.entity';
import { SequenceService } from './sequence.service';

/** Umbral de alto valor que dispara workflow de aprobación (COP). */
const HIGH_VALUE_THRESHOLD = 1_000_000;
const HIGH_VALUE_APPROVER = 'ge@corazacta.com';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly repo: Repository<Contract>,
    @InjectRepository(Workflow)
    private readonly workflowsRepo: Repository<Workflow>,
    private readonly sequence: SequenceService,
    private readonly audit: AuditService,
  ) {}

  list(q?: string) {
    const clean = (q || '').replace(/^#/, '').trim().replace(/[%_]/g, '');
    const qb = this.repo.createQueryBuilder('c');
    if (clean) {
      qb.where(
        `(c.contract_number ILIKE :q OR c.party_a ILIKE :q OR c.party_b ILIKE :q
          OR c.nit ILIKE :q OR c.contract_object ILIKE :q OR c.contract_type ILIKE :q
          OR CAST(c.numeric_code AS text) ILIKE :q OR c.voxelsera ILIKE :q OR c.status ILIKE :q)`,
        { q: `%${clean}%` },
      );
    }
    return qb.orderBy('c.numeric_code', 'DESC').take(80).getMany();
  }

  /** Contratos VIGENTES cuyo end_date cae en los próximos `days` días. */
  async expiring(days: number) {
    return this.repo
      .createQueryBuilder('c')
      .where(`c.status = 'VIGENTE'`)
      .andWhere(`c.end_date IS NOT NULL`)
      .andWhere(`c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + :days * INTERVAL '1 day'`, { days })
      .orderBy('c.end_date', 'ASC')
      .getMany();
  }

  /** Solo previsualiza el código de carpeta. No es el número de contrato. */
  async nextCode(): Promise<{ numeric: number; suggested: string }> {
    const numeric = await this.sequence.peek('contract');
    return { numeric, suggested: String(numeric) };
  }

  async create(dto: CreateContractDto, userId: string) {
    const numeric = await this.sequence.next('contract');
    const number = dto.contractNumber?.trim() ? dto.contractNumber.trim() : null;
    const value = dto.contractValue ? parseFloat(String(dto.contractValue)) : 0;
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueDate = due.toISOString().slice(0, 10);

    const saved = await this.repo.save(
      this.repo.create({
        contractType: dto.contractType ?? null,
        contractNumber: number,
        numericCode: numeric,
        partyA: dto.partyA ?? null,
        partyB: dto.partyB ?? null,
        nit: dto.nit ?? null,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        contractValue: dto.contractValue != null ? String(dto.contractValue) : null,
        contractObject: dto.contractObject ?? null,
        status: 'VIGENTE',
        voxelsera: dto.voxelsera ?? null,
      }),
    );

    // Regla SGD: contratos de alto valor disparan workflow de aprobación (SLA 3 días).
    if (value > HIGH_VALUE_THRESHOLD) {
      await this.workflowsRepo.save(
        this.workflowsRepo.create({
          workflowType: 'APROBACION_CONTRATO_ALTO_VALOR',
          documentId: saved.id,
          requester: userId,
          approver: HIGH_VALUE_APPROVER,
          status: 'PENDIENTE',
          comments: `Contrato de alto valor: $${value}`,
          slaDays: 3,
          dueDate,
        }),
      );
    }

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'contract.create',
      entityType: 'doc_contracts',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async update(id: string, dto: UpdateContractDto, userId: string) {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('Contrato no encontrado');
    const oldValue = { ...existing };
    applyLockedPatch(existing, dto as Partial<Contract>, {
      numericCode: existing.numericCode,
      id: existing.id,
      tenantId: existing.tenantId,
    });
    const saved = await this.repo.save(existing);
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'contract.update',
      entityType: 'doc_contracts',
      entityId: saved.id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }
}
