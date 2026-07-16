import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { WorkCenter } from '../hr-work-centers/entities/work-center.entity';
import { Post, PostStatus } from '../posts/entities/post.entity';
import { BulkAssignPostEquipmentDto } from './dto/bulk-assign.dto';
import { CreatePostEquipmentAssignmentDto } from './dto/create-assignment.dto';
import { CreatePostEquipmentCatalogDto } from './dto/create-catalog.dto';
import { CreatePostEquipmentUnitsDto } from './dto/create-units.dto';
import { ReturnPostEquipmentDto } from './dto/return-assignment.dto';
import {
  PostEquipmentAssignment,
  PostEquipmentStatus,
} from './entities/post-equipment-assignment.entity';
import { PostEquipmentCatalog } from './entities/post-equipment-catalog.entity';
import {
  PostEquipmentUnit,
  PostEquipmentUnitStatus,
} from './entities/post-equipment-unit.entity';

@Injectable()
export class PostEquipmentService {
  constructor(
    @InjectRepository(PostEquipmentAssignment)
    private readonly assignmentsRepo: Repository<PostEquipmentAssignment>,
    @InjectRepository(PostEquipmentCatalog)
    private readonly catalogRepo: Repository<PostEquipmentCatalog>,
    @InjectRepository(PostEquipmentUnit)
    private readonly unitsRepo: Repository<PostEquipmentUnit>,
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    @InjectRepository(WorkCenter)
    private readonly workCentersRepo: Repository<WorkCenter>,
    private readonly audit: AuditService,
  ) {}

  private toCatalogDto(
    c: PostEquipmentCatalog,
    counts?: { totalUnits: number; availableUnits: number; assignedUnits: number },
  ) {
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      brand: c.brand,
      model: c.model,
      category: c.category,
      color: c.color,
      approximateValue: c.approximateValue,
      specs: c.specs,
      requiresReturn: c.requiresReturn,
      isActive: c.isActive,
      totalUnits: counts?.totalUnits ?? 0,
      availableUnits: counts?.availableUnits ?? 0,
      assignedUnits: counts?.assignedUnits ?? 0,
    };
  }

  async listCatalog(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const items = await this.catalogRepo.find({ where, order: { name: 'ASC' } });
    if (!items.length) return [];

    const counts = await this.unitsRepo
      .createQueryBuilder('u')
      .select('u.catalogId', 'catalogId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN u.status = 'AVAILABLE' THEN 1 ELSE 0 END)`,
        'available',
      )
      .addSelect(
        `SUM(CASE WHEN u.status = 'ASSIGNED' THEN 1 ELSE 0 END)`,
        'assigned',
      )
      .where('u.catalogId IN (:...ids)', { ids: items.map((i) => i.id) })
      .groupBy('u.catalogId')
      .getRawMany<{
        catalogId: string;
        total: string;
        available: string;
        assigned: string;
      }>();

    const byCatalog = new Map(
      counts.map((c) => [
        c.catalogId,
        {
          totalUnits: Number(c.total) || 0,
          availableUnits: Number(c.available) || 0,
          assignedUnits: Number(c.assigned) || 0,
        },
      ]),
    );

    return items.map((c) => this.toCatalogDto(c, byCatalog.get(c.id)));
  }

  async createCatalog(dto: CreatePostEquipmentCatalogDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.catalogRepo.findOne({ where: { code } });
    if (existing) throw new ConflictException(`Ya existe el elemento con código ${code}`);

    const saved = await this.catalogRepo.save(
      this.catalogRepo.create({
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        brand: dto.brand?.trim() || null,
        model: dto.model?.trim() || null,
        category: dto.category?.trim() || null,
        color: dto.color?.trim() || null,
        approximateValue:
          dto.approximateValue === undefined || dto.approximateValue === null
            ? null
            : Number(dto.approximateValue),
        specs: dto.specs?.trim() || null,
        requiresReturn: dto.requiresReturn ?? true,
        isActive: true,
      }),
    );

    let totalUnits = 0;
    let availableUnits = 0;
    if (dto.initialQuantity && dto.initialQuantity > 0) {
      const units = await this.createUnits({
        catalogId: saved.id,
        quantity: dto.initialQuantity,
        codePrefix: code,
      });
      totalUnits = units.length;
      availableUnits = units.length;
    }

    return this.toCatalogDto(saved, {
      totalUnits,
      availableUnits,
      assignedUnits: 0,
    });
  }

  async getCatalogDetail(catalogId: string) {
    const catalog = await this.catalogRepo.findOne({ where: { id: catalogId } });
    if (!catalog) throw new NotFoundException('Elemento no encontrado');

    const units = await this.unitsRepo.find({
      where: { catalogId },
      relations: { currentPost: true },
      order: { unitCode: 'ASC' },
    });

    return {
      catalog: this.toCatalogDto(catalog),
      units: units.map((u) => this.toUnitDto(u)),
      summary: {
        total: units.length,
        available: units.filter((u) => u.status === PostEquipmentUnitStatus.AVAILABLE).length,
        assigned: units.filter((u) => u.status === PostEquipmentUnitStatus.ASSIGNED).length,
        lost: units.filter(
          (u) =>
            u.status === PostEquipmentUnitStatus.LOST ||
            u.status === PostEquipmentUnitStatus.WRITTEN_OFF,
        ).length,
      },
      locations: units
        .filter((u) => u.status === PostEquipmentUnitStatus.ASSIGNED && u.currentPost)
        .map((u) => ({
          unitId: u.id,
          unitCode: u.unitCode,
          postId: u.currentPostId,
          postCode: u.currentPost?.code ?? null,
          postName: u.currentPost?.name ?? null,
        })),
    };
  }

  async createUnits(dto: CreatePostEquipmentUnitsDto) {
    const catalog = await this.catalogRepo.findOne({
      where: { id: dto.catalogId, isActive: true },
    });
    if (!catalog) throw new NotFoundException('Elemento de catálogo no encontrado');

    const codes = await this.resolveUnitCodes(catalog, dto);
    if (!codes.length) {
      throw new BadRequestException('Indica cantidad o códigos de unidad');
    }

    const existing = await this.unitsRepo.find({
      where: { catalogId: catalog.id, unitCode: In(codes) },
    });
    if (existing.length) {
      throw new ConflictException(
        `Ya existen unidades: ${existing.map((e) => e.unitCode).join(', ')}`,
      );
    }

    const saved = await this.unitsRepo.save(
      codes.map((unitCode) =>
        this.unitsRepo.create({
          catalogId: catalog.id,
          unitCode,
          status: PostEquipmentUnitStatus.AVAILABLE,
          notes: dto.notes?.trim() || null,
        }),
      ),
    );

    return saved.map((u) => this.toUnitDto(u));
  }

  listAvailableUnits(catalogId?: string) {
    const where: { status: PostEquipmentUnitStatus; catalogId?: string } = {
      status: PostEquipmentUnitStatus.AVAILABLE,
    };
    if (catalogId) where.catalogId = catalogId;
    return this.unitsRepo
      .find({
        where,
        relations: { catalog: true },
        order: { unitCode: 'ASC' },
      })
      .then((units) => units.map((u) => this.toUnitDto(u)));
  }

  async listPostsWithSummary() {
    const posts = await this.postsRepo.find({
      where: { status: PostStatus.ACTIVO },
      order: { name: 'ASC' },
    });

    const workCenterIds = posts
      .map((p) => p.workCenterId)
      .filter((id): id is string => Boolean(id));
    const centers = workCenterIds.length
      ? await this.workCentersRepo.find({ where: { id: In(workCenterIds) } })
      : [];
    const zoneByCenter = new Map(centers.map((c) => [c.id, c.zone]));

    const counts = await this.unitsRepo
      .createQueryBuilder('u')
      .select('u.currentPostId', 'postId')
      .addSelect('COUNT(*)', 'assignedItems')
      .where('u.status = :status', { status: PostEquipmentUnitStatus.ASSIGNED })
      .andWhere('u.currentPostId IS NOT NULL')
      .groupBy('u.currentPostId')
      .getRawMany<{ postId: string; assignedItems: string }>();

    const byPost = new Map(
      counts.map((c) => [c.postId, Number(c.assignedItems) || 0]),
    );

    return posts.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      clientName: p.clientName,
      address: p.address,
      zone: p.workCenterId ? zoneByCenter.get(p.workCenterId) ?? null : null,
      status: p.status,
      assignedItems: byPost.get(p.id) ?? 0,
      assignedQty: byPost.get(p.id) ?? 0,
    }));
  }

  async getPostDetail(postId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Puesto no encontrado');

    const units = await this.unitsRepo.find({
      where: { currentPostId: postId, status: PostEquipmentUnitStatus.ASSIGNED },
      relations: { catalog: true },
      order: { unitCode: 'ASC' },
    });

    const assignments = await this.assignmentsRepo.find({
      where: { postId },
      relations: { catalog: true, unit: true },
      order: { deliveredAt: 'DESC' },
    });

    return {
      post: {
        id: post.id,
        code: post.code,
        name: post.name,
        clientName: post.clientName,
        address: post.address,
        status: post.status,
      },
      units: units.map((u) => this.toUnitDto(u)),
      assignments: assignments.map((a) => this.toAssignmentDto(a)),
      summary: {
        assignedItems: units.length,
        assignedQty: units.length,
      },
    };
  }

  async createAssignment(dto: CreatePostEquipmentAssignmentDto, userId: string) {
    const post = await this.postsRepo.findOne({ where: { id: dto.postId } });
    if (!post) throw new NotFoundException('Puesto no encontrado');

    if (dto.unitId) {
      return this.assignUnit(dto, post, userId);
    }

    if (!dto.catalogId && !dto.customName?.trim()) {
      throw new BadRequestException(
        'Selecciona una unidad del inventario, un elemento del catálogo o un nombre personalizado',
      );
    }

    let catalog: PostEquipmentCatalog | null = null;
    if (dto.catalogId) {
      catalog = await this.catalogRepo.findOne({ where: { id: dto.catalogId, isActive: true } });
      if (!catalog) throw new NotFoundException('Elemento de catálogo no encontrado');
    }

    const saved = await this.assignmentsRepo.save(
      this.assignmentsRepo.create({
        postId: dto.postId,
        catalogId: catalog?.id ?? null,
        customName: dto.customName?.trim() || null,
        quantity: dto.quantity ?? 1,
        serialOrTag: dto.serialOrTag?.trim() || null,
        conditionOnDelivery: dto.conditionOnDelivery?.trim() || null,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : new Date(),
        deliveredBy: userId,
        notes: dto.notes?.trim() || null,
        status: PostEquipmentStatus.ASSIGNED,
      }),
    );

    await this.audit.log({
      userId,
      module: 'post_equipment',
      action: 'assign',
      entityType: 'post_equipment_assignment',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    const full = await this.assignmentsRepo.findOne({
      where: { id: saved.id },
      relations: { catalog: true, unit: true },
    });
    return this.toAssignmentDto(full!);
  }

  async bulkAssign(dto: BulkAssignPostEquipmentDto, userId: string) {
    const results = [];
    for (const unitId of dto.unitIds) {
      results.push(
        await this.createAssignment(
          {
            postId: dto.postId,
            unitId,
            conditionOnDelivery: dto.conditionOnDelivery,
            notes: dto.notes,
          },
          userId,
        ),
      );
    }
    return { assigned: results.length, assignments: results };
  }

  async returnAssignment(id: string, dto: ReturnPostEquipmentDto, userId: string) {
    const existing = await this.assignmentsRepo.findOne({
      where: { id },
      relations: { catalog: true, unit: true },
    });
    if (!existing) throw new NotFoundException('Asignación no encontrada');
    if (existing.status !== PostEquipmentStatus.ASSIGNED) {
      throw new BadRequestException('Solo se pueden devolver elementos en estado ASIGNADO');
    }

    const nextStatus = dto.status ?? PostEquipmentStatus.RETURNED;
    if (
      nextStatus !== PostEquipmentStatus.RETURNED &&
      nextStatus !== PostEquipmentStatus.LOST &&
      nextStatus !== PostEquipmentStatus.WRITTEN_OFF
    ) {
      throw new BadRequestException('Estado de cierre inválido');
    }

    const old = { ...existing };
    existing.status = nextStatus;
    existing.returnedAt = new Date();
    existing.returnedBy = userId;
    existing.returnCondition = dto.returnCondition?.trim() || null;
    existing.returnNotes = dto.returnNotes?.trim() || null;

    const saved = await this.assignmentsRepo.save(existing);

    if (existing.unitId) {
      const unit = await this.unitsRepo.findOne({ where: { id: existing.unitId } });
      if (unit) {
        if (nextStatus === PostEquipmentStatus.RETURNED) {
          unit.status = PostEquipmentUnitStatus.AVAILABLE;
          unit.currentPostId = null;
        } else if (nextStatus === PostEquipmentStatus.LOST) {
          unit.status = PostEquipmentUnitStatus.LOST;
          unit.currentPostId = null;
        } else {
          unit.status = PostEquipmentUnitStatus.WRITTEN_OFF;
          unit.currentPostId = null;
        }
        await this.unitsRepo.save(unit);
      }
    }

    await this.audit.log({
      userId,
      module: 'post_equipment',
      action: 'return',
      entityType: 'post_equipment_assignment',
      entityId: id,
      oldValue: old as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    const full = await this.assignmentsRepo.findOne({
      where: { id },
      relations: { catalog: true, unit: true },
    });
    return this.toAssignmentDto(full!);
  }

  private async assignUnit(
    dto: CreatePostEquipmentAssignmentDto,
    post: Post,
    userId: string,
  ) {
    const unit = await this.unitsRepo.findOne({
      where: { id: dto.unitId },
      relations: { catalog: true },
    });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    if (unit.status !== PostEquipmentUnitStatus.AVAILABLE) {
      throw new BadRequestException(
        `La unidad ${unit.unitCode} no está disponible (estado: ${unit.status})`,
      );
    }

    const saved = await this.assignmentsRepo.save(
      this.assignmentsRepo.create({
        postId: post.id,
        catalogId: unit.catalogId,
        unitId: unit.id,
        customName: null,
        quantity: 1,
        serialOrTag: dto.serialOrTag?.trim() || unit.serialOrTag,
        conditionOnDelivery: dto.conditionOnDelivery?.trim() || null,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : new Date(),
        deliveredBy: userId,
        notes: dto.notes?.trim() || null,
        status: PostEquipmentStatus.ASSIGNED,
      }),
    );

    unit.status = PostEquipmentUnitStatus.ASSIGNED;
    unit.currentPostId = post.id;
    await this.unitsRepo.save(unit);

    await this.audit.log({
      userId,
      module: 'post_equipment',
      action: 'assign_unit',
      entityType: 'post_equipment_unit',
      entityId: unit.id,
      newValue: { assignmentId: saved.id, postId: post.id, unitCode: unit.unitCode },
    });

    const full = await this.assignmentsRepo.findOne({
      where: { id: saved.id },
      relations: { catalog: true, unit: true },
    });
    return this.toAssignmentDto(full!);
  }

  private async resolveUnitCodes(
    catalog: PostEquipmentCatalog,
    dto: CreatePostEquipmentUnitsDto,
  ): Promise<string[]> {
    if (dto.unitCodes?.length) {
      return [...new Set(dto.unitCodes.map((c) => c.trim().toUpperCase()).filter(Boolean))];
    }

    const qty = dto.quantity ?? 0;
    if (qty < 1) return [];

    const prefix = (dto.codePrefix?.trim() || catalog.code).toUpperCase();
    const existing = await this.unitsRepo.find({
      where: { catalogId: catalog.id },
      select: { unitCode: true },
    });
    const used = new Set(existing.map((e) => e.unitCode.toUpperCase()));

    const codes: string[] = [];
    let n = 1;
    while (codes.length < qty && n <= qty + used.size + 50) {
      const code = `${prefix}-${String(n).padStart(2, '0')}`;
      if (!used.has(code)) {
        codes.push(code);
        used.add(code);
      }
      n += 1;
    }

    if (codes.length < qty) {
      throw new BadRequestException('No se pudieron generar suficientes códigos únicos');
    }
    return codes;
  }

  private toUnitDto(u: PostEquipmentUnit) {
    return {
      id: u.id,
      catalogId: u.catalogId,
      catalogName: u.catalog?.name ?? null,
      catalogCode: u.catalog?.code ?? null,
      unitCode: u.unitCode,
      label: u.label,
      serialOrTag: u.serialOrTag,
      status: u.status,
      currentPostId: u.currentPostId,
      currentPostCode: u.currentPost?.code ?? null,
      currentPostName: u.currentPost?.name ?? null,
      notes: u.notes,
    };
  }

  private toAssignmentDto(a: PostEquipmentAssignment) {
    const unitLabel = a.unit
      ? `${a.catalog?.name ?? a.unit.unitCode} (${a.unit.unitCode})`
      : null;
    return {
      id: a.id,
      postId: a.postId,
      catalogId: a.catalogId,
      catalogName: a.catalog?.name ?? null,
      unitId: a.unitId,
      unitCode: a.unit?.unitCode ?? null,
      displayName: unitLabel ?? a.catalog?.name ?? a.customName ?? 'Elemento',
      customName: a.customName,
      quantity: a.quantity,
      serialOrTag: a.serialOrTag,
      conditionOnDelivery: a.conditionOnDelivery,
      deliveredAt: a.deliveredAt,
      deliveredBy: a.deliveredBy,
      notes: a.notes,
      status: a.status,
      returnedAt: a.returnedAt,
      returnedBy: a.returnedBy,
      returnCondition: a.returnCondition,
      returnNotes: a.returnNotes,
      requiresReturn: a.catalog?.requiresReturn ?? true,
    };
  }
}
