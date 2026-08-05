import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateContractDto } from '../dto/create-contract.dto';
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

  list() {
    return this.repo.find({ order: { numericCode: 'DESC' } });
  }

  /** Solo previsualiza: no consume el contador (abrir el form no debe saltar números). */
  async nextCode(): Promise<{ numeric: number; suggested: string }> {
    const numeric = await this.sequence.peek('contract');
    return { numeric, suggested: `CTR-${numeric}-${new Date().getFullYear()}` };
  }

  async create(dto: CreateContractDto, userId: string) {
    const numeric = await this.sequence.next('contract');
    const suggested = `CTR-${numeric}-${new Date().getFullYear()}`;
    const number =
      dto.contractNumber && dto.contractNumber.trim()
        ? dto.contractNumber.trim()
        : suggested;
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
}
