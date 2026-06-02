import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Associate, AssociateStatus } from './entities/associate.entity';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';

@Injectable()
export class AssociatesService {
  constructor(
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
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

    return saved;
  }

  async retire(id: string, userId: string) {
    return this.update(
      id,
      { status: AssociateStatus.RETIRADO },
      userId,
    );
  }
}
