import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CreateCatalogValueDto } from './dto/create-catalog-value.dto';
import { CatalogKind, CatalogValue } from './entities/catalog-value.entity';

@Injectable()
export class HrCatalogsService {
  constructor(
    @InjectRepository(CatalogValue)
    private readonly repo: Repository<CatalogValue>,
    private readonly audit: AuditService,
  ) {}

  listKinds(): CatalogKind[] {
    return Object.values(CatalogKind);
  }

  async findByKind(kind: CatalogKind, includeInactive = false) {
    const where = includeInactive
      ? { kind }
      : { kind, isActive: true };
    return this.repo.find({
      where,
      order: { displayOrder: 'ASC', value: 'ASC' },
    });
  }

  async findAllGrouped(includeInactive = false) {
    const items = await this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { kind: 'ASC', displayOrder: 'ASC', value: 'ASC' },
    });
    const grouped: Record<string, CatalogValue[]> = {};
    for (const item of items) {
      if (!grouped[item.kind]) grouped[item.kind] = [];
      grouped[item.kind].push(item);
    }
    return grouped;
  }

  async create(dto: CreateCatalogValueDto, userId: string) {
    const value = dto.value.trim().toUpperCase();
    const exists = await this.repo.findOne({
      where: { kind: dto.kind, value },
    });
    if (exists) {
      throw new ConflictException(`El valor "${value}" ya existe en el catálogo ${dto.kind}`);
    }
    const created = this.repo.create({
      kind: dto.kind,
      value,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
    });
    const saved = await this.repo.save(created);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'create',
      entityType: 'catalog_value',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async toggle(id: string, userId: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Valor de catálogo no encontrado');
    const oldSnapshot = { ...item };
    item.isActive = !item.isActive;
    const saved = await this.repo.save(item);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'toggle',
      entityType: 'catalog_value',
      entityId: id,
      oldValue: oldSnapshot as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }
}
