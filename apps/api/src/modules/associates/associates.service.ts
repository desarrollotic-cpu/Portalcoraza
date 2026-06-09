import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AssociateHistory } from './entities/associate-history.entity';
import { Associate, AssociateStatus } from './entities/associate.entity';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';

@Injectable()
export class AssociatesService {
  constructor(
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(AssociateHistory)
    private readonly historyRepo: Repository<AssociateHistory>,
    private readonly auditService: AuditService,
  ) {}

  findAll(status?: AssociateStatus) {
    const where = status ? { status } : {};
    return this.associatesRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const associate = await this.associatesRepo.findOne({ where: { id } });
    if (!associate) {
      throw new NotFoundException('Asociado no encontrado');
    }
    return associate;
  }

  async create(dto: CreateAssociateDto, userId: string) {
    const associate = this.associatesRepo.create({
      ...dto,
      createdBy: userId,
      updatedBy: userId,
    });
    const saved = await this.associatesRepo.save(associate);

    await this.auditService.log({
      userId,
      module: 'associates',
      action: 'create',
      entityType: 'associate',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    await this.recordHistoryChanges(
      saved.id,
      userId,
      {},
      dto as unknown as Record<string, unknown>,
    );

    return saved;
  }

  async update(id: string, dto: UpdateAssociateDto, userId: string) {
    const existing = await this.findOne(id);
    const oldSnapshot = { ...existing };

    Object.assign(existing, dto, { updatedBy: userId });
    const saved = await this.associatesRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'associates',
      action: 'update',
      entityType: 'associate',
      entityId: id,
      oldValue: oldSnapshot as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    await this.recordHistoryChanges(
      id,
      userId,
      oldSnapshot as unknown as Record<string, unknown>,
      dto as unknown as Record<string, unknown>,
    );

    return saved;
  }

  async retire(id: string, userId: string) {
    return this.update(
      id,
      { status: AssociateStatus.RETIRADO },
      userId,
    );
  }

  async history(id: string) {
    await this.findOne(id);

    return this.historyRepo.find({
      where: { associateId: id },
      order: { createdAt: 'DESC' },
    });
  }

  private async recordHistoryChanges(
    associateId: string,
    changedBy: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
  ) {
    const changedFields = Object.entries(newValues).filter(
      ([, value]) => value !== undefined,
    );

    if (!changedFields.length) {
      return;
    }

    const rows = changedFields
      .map(([fieldName, newValue]) => {
        const oldValue = oldValues[fieldName];
        if (this.sameValue(oldValue, newValue)) {
          return null;
        }

        return this.historyRepo.create({
          associateId,
          changedBy,
          fieldName,
          oldValue: this.toText(oldValue),
          newValue: this.toText(newValue),
        });
      })
      .filter((row): row is AssociateHistory => row !== null);

    if (rows.length) {
      await this.historyRepo.save(rows);
    }
  }

  private sameValue(a: unknown, b: unknown): boolean {
    return this.toText(a) === this.toText(b);
  }

  private toText(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  }
}
