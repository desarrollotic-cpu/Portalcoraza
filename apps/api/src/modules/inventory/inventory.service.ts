import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { CreateInventoryVariantDto } from './dto/create-inventory-variant.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateInventoryVariantDto } from './dto/update-inventory-variant.dto';
import { InventoryCategory } from './entities/inventory-category.entity';
import {
  InventoryMovement,
  InventoryMovementType,
} from './entities/inventory-movement.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryVariant } from './entities/inventory-variant.entity';

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
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  listItems() {
    return this.itemsRepo.find({
      relations: { category: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createItem(dto: CreateInventoryItemDto, userId: string) {
    const category = await this.categoriesRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('Categoria no encontrada');
    }

    const exists = await this.itemsRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('Codigo de item ya registrado');
    }

    const saved = await this.itemsRepo.save(
      this.itemsRepo.create({
        ...dto,
        lowStockThreshold: dto.lowStockThreshold ?? 0,
      }),
    );

    await this.auditService.log({
      userId,
      module: 'inventory',
      action: 'item.create',
      entityType: 'inventory_item',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
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

  listVariants(itemId?: string) {
    const where = itemId ? { itemId } : {};
    return this.variantsRepo.find({
      where,
      relations: { item: true },
      order: { createdAt: 'DESC' },
    });
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

    const saved = await this.variantsRepo.save(
      this.variantsRepo.create({
        itemId: dto.itemId,
        sku: dto.sku,
        attributes: dto.attributes ?? {},
        stockCurrent: 0,
      }),
    );

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
    const variant = await this.variantsRepo.findOne({
      where: { id: dto.variantId },
      relations: { item: true },
    });

    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    let stockNext = variant.stockCurrent;
    if (dto.movementType === InventoryMovementType.IN) {
      stockNext += dto.quantity;
    } else if (dto.movementType === InventoryMovementType.OUT) {
      if (dto.quantity > variant.stockCurrent) {
        throw new ConflictException('Stock insuficiente');
      }
      stockNext -= dto.quantity;
    } else {
      stockNext = dto.quantity;
    }

    const movement = await this.movementsRepo.save(
      this.movementsRepo.create({
        variantId: dto.variantId,
        movementType: dto.movementType,
        quantity: dto.quantity,
        reason: dto.reason ?? null,
        referenceType: dto.referenceType ?? null,
        referenceId: dto.referenceId ?? null,
        createdBy: userId,
      }),
    );

    variant.stockCurrent = stockNext;
    await this.variantsRepo.save(variant);

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
          stockCurrent: stockNext,
          threshold: variant.item.lowStockThreshold,
        },
      });

      const title = `Stock bajo: ${variant.sku}`;
      const body = `Quedan ${stockNext} unidades (umbral: ${variant.item.lowStockThreshold})`;
      await this.notificationsService.sendToRole('ALMACENISTA', title, body, 'inventory');
      await this.notificationsService.sendToRole('GERENCIA', title, body, 'inventory');
    }

    return {
      movement,
      stockCurrent: stockNext,
      lowStockTriggered: stockNext < variant.item.lowStockThreshold,
    };
  }
}
