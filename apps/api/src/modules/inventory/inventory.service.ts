import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { CreateInventoryTransferDto } from './dto/create-inventory-transfer.dto';
import { CreateInventoryVariantDto } from './dto/create-inventory-variant.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateInventoryVariantDto } from './dto/update-inventory-variant.dto';
import { ValidateStockDto } from './dto/validate-stock.dto';
import { InventoryCategory } from './entities/inventory-category.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import {
  InventoryMovement,
  InventoryMovementType,
} from './entities/inventory-movement.entity';
import { InventoryStock } from './entities/inventory-stock.entity';
import { InventoryVariant } from './entities/inventory-variant.entity';
import { InventoryWarehouse } from './entities/inventory-warehouse.entity';

const GENDERS = [
  { code: 'M', label: 'Hombre' },
  { code: 'F', label: 'Mujer' },
] as const;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryCategory)
    private readonly categoriesRepo: Repository<InventoryCategory>,
    @InjectRepository(InventoryItem)
    private readonly itemsRepo: Repository<InventoryItem>,
    @InjectRepository(InventoryVariant)
    private readonly variantsRepo: Repository<InventoryVariant>,
    @InjectRepository(InventoryMovement)
    private readonly movementsRepo: Repository<InventoryMovement>,
    @InjectRepository(InventoryStock)
    private readonly stockRepo: Repository<InventoryStock>,
    @InjectRepository(InventoryWarehouse)
    private readonly warehousesRepo: Repository<InventoryWarehouse>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listWarehouses() {
    return this.warehousesRepo.find({ order: { name: 'ASC' } });
  }

  async findActorWarehouse(userId: string): Promise<InventoryWarehouse | null> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { warehouse: true },
    });
    return user?.warehouse ?? null;
  }

  async requireActorWarehouse(userId: string): Promise<InventoryWarehouse> {
    const warehouse = await this.findActorWarehouse(userId);
    if (!warehouse) {
      throw new ForbiddenException(
        'Tu usuario no tiene almacén asignado. No puedes mover stock ni entregar.',
      );
    }
    return warehouse;
  }

  async changeStock(variantId: string, warehouseId: string, delta: number): Promise<number> {
    const next = await this.stockRepo.manager.transaction(async (em) => {
      const stockRepo = em.getRepository(InventoryStock);
      let row = await stockRepo.findOne({ where: { variantId, warehouseId } });
      if (!row) {
        row = await stockRepo.save(
          stockRepo.create({ variantId, warehouseId, quantity: 0 }),
        );
      }
      const quantity = row.quantity + delta;
      if (quantity < 0) {
        throw new ConflictException('Stock insuficiente');
      }
      row.quantity = quantity;
      await stockRepo.save(row);

      const total = await stockRepo
        .createQueryBuilder('s')
        .select('COALESCE(SUM(s.quantity), 0)', 'total')
        .where('s.variant_id = :variantId', { variantId })
        .getRawOne<{ total: string }>();
      await em.getRepository(InventoryVariant).update(
        { id: variantId },
        { stockCurrent: Number(total?.total ?? 0) },
      );
      return quantity;
    });
    return next;
  }

  async changeStocks(
    items: Array<{ variantId: string; warehouseId: string; delta: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.changeStock(item.variantId, item.warehouseId, item.delta);
    }
  }

  private warehouseQty(variant: InventoryVariant, warehouseId?: string | null): number {
    const stocks = variant.stocks ?? [];
    if (warehouseId) {
      return stocks.find((s) => s.warehouseId === warehouseId)?.quantity ?? 0;
    }
    return stocks.reduce((sum, s) => sum + s.quantity, 0);
  }

  private decorateVariant(variant: InventoryVariant, actorWarehouseId?: string | null) {
    const stocks = (variant.stocks ?? []).map((s) => ({
      warehouseId: s.warehouseId,
      warehouseCode: s.warehouse?.code ?? null,
      warehouseName: s.warehouse?.name ?? null,
      quantity: s.quantity,
    }));
    const stockOwn = actorWarehouseId ? this.warehouseQty(variant, actorWarehouseId) : null;
    const stockTotal = stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      ...variant,
      stocks,
      stockOwn,
      stockTotal,
      stockCurrent: stockOwn ?? stockTotal,
    };
  }

  private async ensureStockRows(variantId: string): Promise<void> {
    const warehouses = await this.warehousesRepo.find();
    for (const warehouse of warehouses) {
      const exists = await this.stockRepo.findOne({
        where: { variantId, warehouseId: warehouse.id },
      });
      if (!exists) {
        await this.stockRepo.save(
          this.stockRepo.create({ variantId, warehouseId: warehouse.id, quantity: 0 }),
        );
      }
    }
  }

  private async otherWarehouse(fromId: string): Promise<InventoryWarehouse> {
    const dest = await this.warehousesRepo
      .createQueryBuilder('w')
      .where('w.id <> :id', { id: fromId })
      .orderBy('w.code', 'ASC')
      .getOne();
    if (!dest) {
      throw new BadRequestException('No hay almacén destino para el traslado');
    }
    return dest;
  }

  listCategories() {
    return this.categoriesRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createCategory(dto: CreateInventoryCategoryDto, userId: string) {
    const exists = await this.categoriesRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('Codigo de categoria ya registrado');
    }

    const saved = await this.categoriesRepo.save(this.categoriesRepo.create(dto));
    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'category.create',
      entityType: 'inventory_category',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async updateCategory(id: string, dto: UpdateInventoryCategoryDto, userId: string) {
    const existing = await this.categoriesRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Categoria no encontrada');
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.categoriesRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'category.update',
      entityType: 'inventory_category',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listItems() {
    const rows = await this.itemsRepo.find({
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
    const userIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))] as string[];
    const users = userIds.length
      ? await this.usersRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName ?? u.email]));
    return rows.map((item) => ({
      ...item,
      createdByName: item.createdBy ? (userMap.get(item.createdBy) ?? null) : null,
    }));
  }

  async createItem(dto: CreateInventoryItemDto, userId: string) {
    const category = await this.categoriesRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }

    const code = (dto.code?.trim() || (await this.generateItemCode(category, dto.name))).toUpperCase();
    const exists = await this.itemsRepo.findOne({ where: { code } });
    if (exists) {
      throw new ConflictException('Codigo de item ya registrado');
    }

    const saved = await this.itemsRepo.save(
      this.itemsRepo.create({
        categoryId: dto.categoryId,
        code,
        name: dto.name.trim(),
        unit: dto.unit?.trim() || 'und',
        lowStockThreshold: dto.lowStockThreshold ?? 0,
        createdBy: userId,
        updatedBy: userId,
      }),
    );

    const variants: InventoryVariant[] = [];
    for (const gender of GENDERS) {
      const variant = await this.variantsRepo.save(
        this.variantsRepo.create({
          itemId: saved.id,
          sku: `${code}-${gender.code}`,
          attributes: { genero: gender.label },
          talla: null,
          color: null,
          genero: gender.code,
          stockCurrent: 0,
        }),
      );
      await this.ensureStockRows(variant.id);
      variants.push(variant);
    }

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'item.create',
      entityType: 'inventory_item',
      entityId: saved.id,
      newValue: {
        code: saved.code,
        name: saved.name,
        variantSkus: variants.map((v) => v.sku),
      },
    });

    return this.itemsRepo.findOneOrFail({
      where: { id: saved.id },
      relations: { category: true },
    });
  }

  /** Genera código tipo APE001 a partir de categoría/nombre. */
  private async generateItemCode(category: InventoryCategory, name: string): Promise<string> {
    const raw = (category.code || name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();
    const prefix = (raw.slice(0, 3) || 'ITM').padEnd(3, 'X');

    const rows = await this.itemsRepo
      .createQueryBuilder('i')
      .select(['i.code'])
      .where('UPPER(i.code) LIKE :like', { like: `${prefix}%` })
      .getMany();

    let max = 0;
    const re = new RegExp(`^${prefix}(\\d+)$`, 'i');
    for (const row of rows) {
      const m = row.code.match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  async updateItem(id: string, dto: UpdateInventoryItemDto, userId: string) {
    const existing = await this.itemsRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Item no encontrado');
    }

    if (dto.categoryId) {
      const category = await this.categoriesRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException('Categoria no encontrada');
      }
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    existing.updatedBy = userId;
    const saved = await this.itemsRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'item.update',
      entityType: 'inventory_item',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async deleteItem(id: string, userId: string) {
    const existing = await this.itemsRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Elemento no encontrado');
    }

    const variants = await this.variantsRepo.find({ where: { itemId: id } });
    const variantIds = variants.map((v) => v.id);

    if (variantIds.length) {
      const usedInDeliveries = await this.variantsRepo.manager.query(
        `SELECT COUNT(*)::int AS c FROM delivery_details WHERE variant_id = ANY($1::uuid[])`,
        [variantIds],
      );
      const deliveryCount = Number(usedInDeliveries?.[0]?.c ?? 0);
      if (deliveryCount > 0) {
        throw new ConflictException(
          'No se puede eliminar: el elemento ya se usó en entregas de dotación.',
        );
      }

      await this.movementsRepo
        .createQueryBuilder()
        .delete()
        .where('variant_id IN (:...ids)', { ids: variantIds })
        .execute();

      await this.variantsRepo.delete({ itemId: id });
    }

    await this.itemsRepo.delete(id);

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'item.delete',
      entityType: 'inventory_item',
      entityId: id,
      oldValue: {
        code: existing.code,
        name: existing.name,
        categoryId: existing.categoryId,
      },
    });

    return { ok: true };
  }

  async listVariants(itemId?: string, userId?: string) {
    const where = itemId ? { itemId } : {};
    const rows = await this.variantsRepo.find({
      where,
      relations: { item: true, stocks: { warehouse: true } },
      order: { createdAt: 'DESC' },
    });
    const actor = userId ? await this.findActorWarehouse(userId) : null;
    return rows.map((v) => this.decorateVariant(v, actor?.id ?? null));
  }

  async createVariant(dto: CreateInventoryVariantDto, userId: string) {
    const item = await this.itemsRepo.findOne({ where: { id: dto.itemId } });
    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    const exists = await this.variantsRepo.findOne({ where: { sku: dto.sku } });
    if (exists) {
      throw new ConflictException('SKU ya registrado');
    }

    const talla = dto.talla?.trim() || null;
    const color = dto.color?.trim() || null;
    const genero = dto.genero?.trim() || null;
    const genderLabel =
      genero === 'F' ? 'Mujer' : genero === 'M' ? 'Hombre' : genero;
    const attributes: Record<string, unknown> = { ...(dto.attributes ?? {}) };
    if (talla) attributes['talla'] = talla;
    if (color) attributes['color'] = color;
    if (genderLabel) attributes['genero'] = genderLabel;

    const saved = await this.variantsRepo.save(
      this.variantsRepo.create({
        itemId: dto.itemId,
        sku: dto.sku,
        attributes,
        talla,
        color,
        genero,
        stockCurrent: 0,
      }),
    );
    await this.ensureStockRows(saved.id);

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'variant.create',
      entityType: 'inventory_variant',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateVariant(id: string, dto: UpdateInventoryVariantDto, userId: string) {
    const existing = await this.variantsRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Variante no encontrada');
    }

    if (dto.itemId) {
      const item = await this.itemsRepo.findOne({ where: { id: dto.itemId } });
      if (!item) {
        throw new NotFoundException('Item no encontrado');
      }
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.variantsRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'variant.update',
      entityType: 'inventory_variant',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async createMovement(dto: CreateInventoryMovementDto, userId: string) {
    if (dto.movementType === InventoryMovementType.TRANSFER) {
      throw new BadRequestException('Usa el endpoint de traslado para mover entre almacenes');
    }

    const warehouse = await this.requireActorWarehouse(userId);
    const variant = await this.variantsRepo.findOne({
      where: { id: dto.variantId },
      relations: { item: true, stocks: true },
    });

    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const entryReason =
      dto.entryReason?.trim() ||
      (dto.reason?.includes(' — ')
        ? dto.reason.split(' — ')[0].trim()
        : dto.reason?.trim()) ||
      null;
    const observations =
      dto.observations?.trim() ||
      (dto.reason?.includes(' — ')
        ? dto.reason.split(' — ').slice(1).join(' — ').trim() || null
        : null);

    if (dto.movementType === InventoryMovementType.IN && !entryReason) {
      throw new BadRequestException('El motivo de entrada es obligatorio');
    }

    const current = this.warehouseQty(variant, warehouse.id);
    let delta = 0;
    let stockNext = current;
    if (dto.movementType === InventoryMovementType.IN) {
      delta = dto.quantity;
      stockNext = current + dto.quantity;
    } else if (dto.movementType === InventoryMovementType.OUT) {
      delta = -dto.quantity;
      stockNext = current - dto.quantity;
    } else {
      delta = dto.quantity - current;
      stockNext = dto.quantity;
    }

    const reasonSummary = [entryReason, observations].filter(Boolean).join(' — ') || null;

    const movement = await this.movementsRepo.save(
      this.movementsRepo.create({
        variantId: dto.variantId,
        movementType: dto.movementType,
        quantity: dto.quantity,
        entryReason,
        observations,
        reason: reasonSummary,
        warehouseId: warehouse.id,
        reference:
          dto.referenceType && dto.referenceId
            ? `${dto.referenceType}:${dto.referenceId}`
            : dto.referenceType ?? null,
        performedBy: userId,
      }),
    );

    await this.changeStock(dto.variantId, warehouse.id, delta);

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'movement.create',
      entityType: 'inventory_movement',
      entityId: movement.id,
      newValue: movement as unknown as Record<string, unknown>,
    });

    if (stockNext < variant.item.lowStockThreshold) {
      await this.auditService.log({
        userId,
        module: 'inventory',
        action: 'stock.low',
        entityType: 'inventory_variant',
        entityId: variant.id,
        newValue: {
          sku: variant.sku,
          warehouse: warehouse.code,
          stockCurrent: stockNext,
          threshold: variant.item.lowStockThreshold,
        },
      });

      const title = `Stock bajo: ${variant.sku} (${warehouse.name})`;
      const body = `Quedan ${stockNext} unidades (umbral: ${variant.item.lowStockThreshold})`;
      await this.notificationsService.sendToRole('ALMACENISTA', title, body, 'inventory');
      await this.notificationsService.sendToRole('GERENCIA', title, body, 'inventory');
    }

    return {
      movement,
      stockCurrent: stockNext,
      warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
      lowStockTriggered: stockNext < variant.item.lowStockThreshold,
    };
  }

  async transfer(dto: CreateInventoryTransferDto, userId: string) {
    const source = await this.requireActorWarehouse(userId);
    const dest = await this.otherWarehouse(source.id);
    const variant = await this.variantsRepo.findOne({
      where: { id: dto.variantId },
      relations: { item: true, stocks: true },
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const current = this.warehouseQty(variant, source.id);
    if (dto.quantity > current) {
      throw new ConflictException('Stock insuficiente en tu almacén para el traslado');
    }

    await this.changeStock(dto.variantId, source.id, -dto.quantity);
    await this.changeStock(dto.variantId, dest.id, dto.quantity);

    const observations = dto.observations?.trim() || null;
    const reason = `Traslado ${source.name} → ${dest.name}`;
    const movement = await this.movementsRepo.save(
      this.movementsRepo.create({
        variantId: dto.variantId,
        movementType: InventoryMovementType.TRANSFER,
        quantity: dto.quantity,
        entryReason: 'Traslado',
        observations,
        reason: observations ? `${reason} — ${observations}` : reason,
        warehouseId: source.id,
        destWarehouseId: dest.id,
        performedBy: userId,
      }),
    );

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'movement.transfer',
      entityType: 'inventory_movement',
      entityId: movement.id,
      newValue: {
        variantId: dto.variantId,
        quantity: dto.quantity,
        from: source.code,
        to: dest.code,
      },
    });

    return {
      movement,
      from: { id: source.id, code: source.code, name: source.name },
      to: { id: dest.id, code: dest.code, name: dest.name },
      stockSource: current - dto.quantity,
      stockDest: this.warehouseQty(variant, dest.id) + dto.quantity,
    };
  }

  async getAvailableStock(
    category: string,
    talla?: string,
    genero?: string,
    userId?: string,
  ) {
    const actor = userId ? await this.findActorWarehouse(userId) : null;
    const variant = await this.findVariantForDelivery(category, talla, genero, actor?.id);
    if (!variant) {
      return { quantity: 0, variantId: null };
    }
    return {
      quantity: this.warehouseQty(variant, actor?.id),
      variantId: variant.id,
    };
  }

  async validateStock(dto: ValidateStockDto, userId?: string) {
    const actor = userId ? await this.findActorWarehouse(userId) : null;
    const validations = await Promise.all(
      dto.elementos.map(async (elemento) => {
        const variant = await this.findVariantForDelivery(
          elemento.category,
          elemento.talla,
          elemento.genero,
          actor?.id,
        );
        const available = variant ? this.warehouseQty(variant, actor?.id) : 0;
        return {
          category: elemento.category,
          talla: elemento.talla ?? null,
          genero: this.normalizeGenero(elemento.genero),
          quantity: elemento.quantity,
          available,
          variantId: variant?.id ?? null,
          valid: available >= elemento.quantity && available > 0,
        };
      }),
    );

    return {
      valid: validations.every((v) => v.valid),
      validations,
    };
  }

  private normalizeGenero(genero?: string | null): string | null {
    if (!genero || genero === 'N/A' || genero === '') {
      return null;
    }
    const key = genero.trim().toLowerCase();
    if (key === 'm' || key === 'hombre' || key === 'masculino') return 'M';
    if (key === 'f' || key === 'mujer' || key === 'femenino') return 'F';
    return genero;
  }

  private async findVariantForDelivery(
    category: string,
    talla?: string,
    genero?: string,
    warehouseId?: string | null,
  ): Promise<InventoryVariant | null> {
    const normalizedGenero = this.normalizeGenero(genero);
    const categoryKey = category.toLowerCase().trim();

    const variants = await this.variantsRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.item', 'item')
      .innerJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('variant.stocks', 'stocks')
      .where(
        '(LOWER(category.code) = :category OR LOWER(item.name) LIKE :namePattern)',
        { category: categoryKey, namePattern: `%${categoryKey}%` },
      )
      .getMany();

    const qty = (v: InventoryVariant) => this.warehouseQty(v, warehouseId);

    const filtered = variants.filter((variant) => {
      const attrs = variant.attributes ?? {};
      const variantTalla = String(attrs['talla'] ?? variant.talla ?? '').trim();
      const variantGenero = this.normalizeGenero(
        variant.genero ?? (attrs['genero'] != null ? String(attrs['genero']) : null),
      );

      if (talla) {
        if (variantTalla !== talla) {
          return false;
        }
        if (normalizedGenero) {
          return variantGenero === normalizedGenero;
        }
        return variantGenero === null;
      }

      return !variantTalla;
    });

    if (filtered.length === 0) {
      return null;
    }

    filtered.sort((a, b) => qty(b) - qty(a));
    return filtered.find((v) => qty(v) > 0) ?? filtered[0] ?? null;
  }

  async countItems(): Promise<number> {
    return this.itemsRepo.count();
  }

  async countVariants(): Promise<number> {
    return this.variantsRepo.count();
  }

  async listMovements(limit = 150) {
    const take = Math.min(limit, 500);
    const rows = await this.movementsRepo.find({
      relations: {
        variant: { item: { category: true } },
        warehouse: true,
        destWarehouse: true,
      },
      order: { createdAt: 'DESC' },
      take,
    });

    const catalogLogs = await this.auditService.listByActions(
      'inventory',
      ['item.create', 'item.update'],
      take,
    );

    const userIds = [
      ...new Set(
        [
          ...rows.map((m) => m.performedBy),
          ...catalogLogs.map((l) => l.userId),
        ].filter(Boolean),
      ),
    ] as string[];
    const users = userIds.length
      ? await this.usersRepo.find({ where: { id: In(userIds) } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName ?? u.email]));

    const movements = rows.map((m) => ({
      ...m,
      performedByName: m.performedBy ? (userMap.get(m.performedBy) ?? null) : null,
      warehouseName: m.warehouse?.name ?? null,
      destWarehouseName: m.destWarehouse?.name ?? null,
    }));

    const catalog = catalogLogs.map((log) => {
      const payload = (log.newValue ?? {}) as Record<string, unknown>;
      const name = typeof payload['name'] === 'string' ? payload['name'] : 'Elemento';
      const code = typeof payload['code'] === 'string' ? payload['code'] : '';
      return {
        id: log.id,
        variantId: null,
        movementType: log.action === 'item.create' ? 'CREATE' : 'UPDATE',
        quantity: 0,
        reason: log.action === 'item.create' ? 'Creación de elemento' : 'Edición de elemento',
        entryReason: log.action === 'item.create' ? 'Creación' : 'Edición',
        observations: code ? `${name} (${code})` : name,
        reference: log.entityId,
        performedBy: log.userId,
        performedByName: log.userId ? (userMap.get(log.userId) ?? null) : null,
        warehouseId: null,
        destWarehouseId: null,
        warehouseName: null,
        destWarehouseName: null,
        createdAt: log.createdAt,
        variant: null,
      };
    });

    return [...movements, ...catalog]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, take);
  }

  async countLowStockVariants(): Promise<number> {
    const rows = await this.stockRepo
      .createQueryBuilder('s')
      .innerJoin('s.variant', 'v')
      .innerJoin('v.item', 'item')
      .where('item.low_stock_threshold > 0')
      .andWhere('s.quantity < item.low_stock_threshold')
      .getCount();
    return rows;
  }

  /** Variantes con cantidad 0 en al menos un almacén (agotado en esa sede). */
  async countZeroStockVariants(): Promise<number> {
    return this.stockRepo
      .createQueryBuilder('s')
      .where('s.quantity = 0')
      .getCount();
  }

  async listLowStockVariants(take = 10) {
    const rows = await this.stockRepo
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.variant', 'v')
      .innerJoinAndSelect('v.item', 'item')
      .innerJoinAndSelect('s.warehouse', 'w')
      .where('item.low_stock_threshold > 0')
      .andWhere('s.quantity < item.low_stock_threshold')
      .orderBy('s.quantity', 'ASC')
      .take(take)
      .getMany();

    return rows.map((s) => ({
      ...s.variant,
      stockCurrent: s.quantity,
      warehouseName: s.warehouse?.name ?? null,
      item: s.variant.item,
    }));
  }
}
