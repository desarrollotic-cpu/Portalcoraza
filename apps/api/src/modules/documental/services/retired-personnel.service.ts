import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  list() {
    return this.repo.find({
      order: { retirementDate: 'DESC', fullName: 'ASC' },
      take: 500,
    });
  }

  /** Busca en RRHH (associates) por número de cédula para autocompletar el formulario. */
  async lookupAssociate(cedula: string): Promise<{
    found: boolean;
    alreadyRegistered: boolean;
    existingCode: number | null;
    fullName: string | null;
    retirementDate: string | null;
    personType: string | null;
  }> {
    // 1. Buscar en RRHH
    const rows = await this.dataSource.query<
      {
        first_name: string;
        second_name: string | null;
        first_last_name: string;
        second_last_name: string | null;
        updated_at: string;
        status: string;
      }[]
    >(
      `SELECT first_name, second_name, first_last_name, second_last_name, updated_at, status
       FROM associates
       WHERE document_number = $1
       LIMIT 1`,
      [cedula],
    );

    if (!rows.length) {
      return { found: false, alreadyRegistered: false, existingCode: null, fullName: null, retirementDate: null, personType: null };
    }

    const a = rows[0];
    const parts = [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean);
    const fullName = parts.join(' ').trim();
    const retirementDate = a.updated_at ? a.updated_at.split('T')[0] : null;

    // 2. Verificar si ya tiene carpeta en Documental
    const existing = await this.repo.findOne({ where: { idNumber: cedula } });
    if (existing) {
      return {
        found: true,
        alreadyRegistered: true,
        existingCode: existing.numericCode ?? null,
        fullName,
        retirementDate,
        personType: 'ASOCIADO',
      };
    }

    return {
      found: true,
      alreadyRegistered: false,
      existingCode: null,
      fullName,
      retirementDate,
      personType: 'ASOCIADO',
    };
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
