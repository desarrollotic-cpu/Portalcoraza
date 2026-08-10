import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateRetiredPersonnelDto } from '../dto/create-retired-personnel.dto';
import { RetiredPersonnel } from '../entities/retired-personnel.entity';
import { SequenceService } from './sequence.service';

@Injectable()
export class RetiredPersonnelService {
  constructor(
    @InjectRepository(RetiredPersonnel)
    private readonly repo: Repository<RetiredPersonnel>,
    private readonly sequence: SequenceService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.repo.find({
      order: { retirementDate: 'DESC', fullName: 'ASC' },
    });
  }

  async create(dto: CreateRetiredPersonnelDto, userId: string) {
    const numeric = await this.sequence.next('retired_personnel');

    const saved = await this.repo.save(
      this.repo.create({
        fullName: dto.fullName,
        idNumber: dto.idNumber,
        retirementDate: dto.retirementDate ?? null,
        retirementReason: dto.retirementReason ?? null,
        observations: dto.observations ?? null,
        personType: dto.personType ?? 'EMPLEADO',
        numericCode: numeric,
        voxelsera: dto.voxelsera ?? null,
      }),
    );

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'retired_personnel.create',
      entityType: 'doc_retired_personnel',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateType(id: string, personType: string, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Registro no encontrado');
    }
    existing.personType = personType;
    const saved = await this.repo.save(existing);
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'retired_personnel.update_type',
      entityType: 'doc_retired_personnel',
      entityId: id,
      newValue: { personType } as Record<string, unknown>,
    });
    return saved;
  }
}
