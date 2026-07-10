import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, FindOptionsWhere, Brackets } from 'typeorm';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { AuditService } from '../audit/audit.service';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { InventoryVariant } from '../inventory/entities/inventory-variant.entity';
import { Post } from '../posts/entities/post.entity';
import { InventoryService } from '../inventory/inventory.service';
import { DeliverableAssociateDto } from './dto/deliverable-associate.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import {
  DotacionOverviewDto,
  WithoutDotacionRowDto,
} from './dto/dotacion-overview.dto';
import {
  DotacionAssociateRowDto,
  PaginatedDotacionAssociatesDto,
} from './dto/dotacion-associate.dto';
import { RevertDeliveryDto } from './dto/revert-delivery.dto';
import { SignDeliveryDto } from './dto/sign-delivery.dto';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';

const REVERT_WINDOW_HOURS = 120;

/** Estados HR que permiten recibir dotación. */
const DELIVERABLE_STATUSES: AssociateStatus[] = [
  AssociateStatus.ACTIVO,
  AssociateStatus.VACACIONES,
];

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveriesRepo: Repository<Delivery>,
    @InjectRepository(DeliveryDetail)
    private readonly detailsRepo: Repository<DeliveryDetail>,
    @InjectRepository(InventoryVariant)
    private readonly variantsRepo: Repository<InventoryVariant>,
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly supabaseStorage: SupabaseStorageService,
    private readonly inventoryService: InventoryService,
  ) {}

  async list(filters?: { associateId?: string; postId?: string }) {
    const where: FindOptionsWhere<Delivery> = {};
    if (filters?.associateId) {
      where.associateId = filters.associateId;
    }
    if (filters?.postId) {
      where.postId = filters.postId;
    }

    return this.deliveriesRepo.find({
      where,
      relations: {
        details: { variant: { item: true } },
        associate: { jobPosition: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async listPaginated(filters?: {
    page?: number;
    limit?: number;
    associateId?: string;
    postId?: string;
    search?: string;
  }) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(10, filters?.limit ?? 25));
    const skip = (page - 1) * limit;

    const qb = this.deliveriesRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.details', 'details')
      .leftJoinAndSelect('details.variant', 'variant')
      .leftJoinAndSelect('variant.item', 'item')
      .leftJoinAndSelect('d.associate', 'associate')
      .leftJoinAndSelect('associate.jobPosition', 'jobPosition')
      .orderBy('d.createdAt', 'DESC');

    if (filters?.associateId) {
      qb.andWhere('d.associateId = :associateId', { associateId: filters.associateId });
    }
    if (filters?.postId) {
      qb.andWhere('d.postId = :postId', { postId: filters.postId });
    }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim().toUpperCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(associate.documentNumber) LIKE :term', { term })
            .orWhere('UPPER(associate.firstName) LIKE :term', { term })
            .orWhere('UPPER(associate.firstLastName) LIKE :term', { term })
            .orWhere('UPPER(associate.secondName) LIKE :term', { term })
            .orWhere('UPPER(associate.secondLastName) LIKE :term', { term });
        }),
      );
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** Asociados ACTIVO/VACACIONES para selector de dotación (sin permiso HR completo). */
  async listEligibleAssociates(): Promise<DeliverableAssociateDto[]> {
    const rows = await this.associatesRepo.find({
      where: { status: In(DELIVERABLE_STATUSES) },
      relations: { jobPosition: true },
      order: { firstLastName: 'ASC', firstName: 'ASC' },
    });

    return rows.map((a) => ({
      id: a.id,
      documentNumber: a.documentNumber,
      firstName: a.firstName,
      secondName: a.secondName,
      firstLastName: a.firstLastName,
      secondLastName: a.secondLastName,
      status: a.status,
      jobPositionName: a.jobPosition?.name ?? null,
    }));
  }

  async listAssociatesForDotacion(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    workCenterId?: string;
  }): Promise<PaginatedDotacionAssociatesDto> {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(10, filters?.limit ?? 25));
    const skip = (page - 1) * limit;

    const qb = this.associatesRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.jobPosition', 'jp')
      .leftJoinAndSelect('a.workCenter', 'wc')
      .where('a.status IN (:...statuses)', { statuses: DELIVERABLE_STATUSES });

    if (filters?.workCenterId) {
      qb.andWhere('a.workCenterId = :wcId', { wcId: filters.workCenterId });
    }

    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim().toUpperCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(a.documentNumber) LIKE :term', { term })
            .orWhere('UPPER(a.firstName) LIKE :term', { term })
            .orWhere('UPPER(a.secondName) LIKE :term', { term })
            .orWhere('UPPER(a.firstLastName) LIKE :term', { term })
            .orWhere('UPPER(a.secondLastName) LIKE :term', { term })
            .orWhere('UPPER(wc.code) LIKE :term', { term })
            .orWhere('UPPER(wc.client_name) LIKE :term', { term })
            .orWhere('UPPER(wc.zone) LIKE :term', { term });
        }),
      );
    }

    qb.orderBy('a.firstLastName', 'ASC').addOrderBy('a.firstName', 'ASC');

    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items: rows.map((a) => this.toDotacionAssociateRow(a)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getOverview(): Promise<DotacionOverviewDto> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [
      lowStockCount,
      lowStockVariants,
      pendingDeliveries,
      deliveredToday,
      deliveredThisWeek,
      totalActiveAssociates,
      withoutDotacionCount,
      recentRows,
      inventoryItemCount,
      inventoryVariantCount,
      topDeliveredItems,
    ] = await Promise.all([
      this.inventoryService.countLowStockVariants(),
      this.inventoryService.listLowStockVariants(8),
      this.deliveriesRepo.count({ where: { status: DeliveryStatus.PENDING } }),
      this.deliveriesRepo
        .createQueryBuilder('d')
        .where('d.status = :status', { status: DeliveryStatus.DELIVERED })
        .andWhere('d.delivered_at >= :todayStart', { todayStart })
        .getCount(),
      this.deliveriesRepo
        .createQueryBuilder('d')
        .where('d.status = :status', { status: DeliveryStatus.DELIVERED })
        .andWhere('d.delivered_at >= :weekStart', { weekStart })
        .getCount(),
      this.associatesRepo.count({ where: { status: In(DELIVERABLE_STATUSES) } }),
      this.countWithoutDotacion(7),
      this.deliveriesRepo.find({
        relations: { associate: true, details: true },
        order: { createdAt: 'DESC' },
        take: 6,
      }),
      this.inventoryService.countItems(),
      this.inventoryService.countVariants(),
      this.getTopDeliveredItems(8),
    ]);

    return {
      lowStockCount,
      pendingDeliveries,
      deliveredToday,
      deliveredThisWeek,
      totalActiveAssociates,
      withoutDotacionCount,
      inventoryItemCount,
      inventoryVariantCount,
      topDeliveredItems: topDeliveredItems.map((r) => ({
        itemName: r.itemName,
        sku: r.sku,
        totalQuantity: Number(r.totalQuantity),
      })),
      lowStockItems: lowStockVariants.map((v) => ({
        sku: v.sku,
        itemName: v.item?.name ?? v.sku,
        stockCurrent: v.stockCurrent,
        threshold: v.item?.lowStockThreshold ?? 0,
      })),
      recentDeliveries: recentRows.map((d) => ({
        id: d.id,
        associateName: d.associate ? this.formatAssociateName(d.associate) : null,
        status: d.status,
        itemCount: d.details?.length ?? 0,
        date: (d.deliveredAt ?? d.createdAt).toISOString(),
      })),
    };
  }

  async listWithoutDotacion(months = 7): Promise<WithoutDotacionRowDto[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    cutoff.setHours(0, 0, 0, 0);

    const rows = await this.associatesRepo
      .createQueryBuilder('a')
      .leftJoin('a.jobPosition', 'jp')
      .leftJoin('a.workCenter', 'wc')
      .leftJoin(
        Delivery,
        'd',
        'd.associate_id = a.id AND d.status = :deliveredStatus',
        { deliveredStatus: DeliveryStatus.DELIVERED },
      )
      .select('a.id', 'id')
      .addSelect('a.document_number', 'documentNumber')
      .addSelect('a.first_name', 'firstName')
      .addSelect('a.second_name', 'secondName')
      .addSelect('a.first_last_name', 'firstLastName')
      .addSelect('a.second_last_name', 'secondLastName')
      .addSelect('a.status', 'status')
      .addSelect('jp.name', 'jobPositionName')
      .addSelect('wc.code', 'workCenterCode')
      .addSelect('MAX(COALESCE(d.delivered_at, d.created_at))', 'lastDeliveryDate')
      .where('a.status IN (:...statuses)', { statuses: DELIVERABLE_STATUSES })
      .groupBy('a.id')
      .addGroupBy('a.document_number')
      .addGroupBy('a.first_name')
      .addGroupBy('a.second_name')
      .addGroupBy('a.first_last_name')
      .addGroupBy('a.second_last_name')
      .addGroupBy('a.status')
      .addGroupBy('jp.name')
      .addGroupBy('wc.code')
      .having(
        'MAX(COALESCE(d.delivered_at, d.created_at)) IS NULL OR MAX(COALESCE(d.delivered_at, d.created_at)) < :cutoff',
        { cutoff },
      )
      .orderBy('MAX(COALESCE(d.delivered_at, d.created_at))', 'ASC', 'NULLS FIRST')
      .getRawMany<{
        id: string;
        documentNumber: string;
        firstName: string;
        secondName: string | null;
        firstLastName: string;
        secondLastName: string | null;
        status: string;
        jobPositionName: string | null;
        workCenterCode: string | null;
        lastDeliveryDate: string | null;
      }>();

    const now = Date.now();
    return rows.map((row) => {
      const lastDate = row.lastDeliveryDate ? new Date(row.lastDeliveryDate) : null;
      const monthsSinceDelivery = lastDate
        ? Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        : null;

      return {
        id: row.id,
        documentNumber: row.documentNumber,
        fullName: this.formatRawAssociateName(row),
        status: row.status,
        jobPositionName: row.jobPositionName,
        workCenterCode: row.workCenterCode,
        lastDeliveryDate: lastDate ? lastDate.toISOString() : null,
        monthsSinceDelivery,
      };
    });
  }

  private async countWithoutDotacion(months: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    cutoff.setHours(0, 0, 0, 0);

    const result = await this.associatesRepo
      .createQueryBuilder('a')
      .leftJoin(
        Delivery,
        'd',
        'd.associate_id = a.id AND d.status = :deliveredStatus',
        { deliveredStatus: DeliveryStatus.DELIVERED },
      )
      .select('a.id')
      .where('a.status IN (:...statuses)', { statuses: DELIVERABLE_STATUSES })
      .groupBy('a.id')
      .having(
        'MAX(COALESCE(d.delivered_at, d.created_at)) IS NULL OR MAX(COALESCE(d.delivered_at, d.created_at)) < :cutoff',
        { cutoff },
      )
      .getRawMany();

    return result.length;
  }

  private formatAssociateName(a: Associate): string {
    return [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toDotacionAssociateRow(a: Associate): DotacionAssociateRowDto {
    return {
      id: a.id,
      documentNumber: a.documentNumber,
      firstName: a.firstName,
      secondName: a.secondName,
      firstLastName: a.firstLastName,
      secondLastName: a.secondLastName,
      fullName: this.formatAssociateName(a),
      status: a.status,
      jobPositionName: a.jobPosition?.name ?? null,
      workCenterCode: a.workCenter?.code ?? null,
      workCenterZone: a.workCenter?.zone ?? null,
      workCenterClient: a.workCenter?.clientName ?? null,
      hireDate: a.hireDate ?? null,
    };
  }

  private async getTopDeliveredItems(take = 8) {
    return this.detailsRepo
      .createQueryBuilder('dd')
      .innerJoin('dd.delivery', 'd')
      .innerJoin('dd.variant', 'v')
      .innerJoin('v.item', 'item')
      .where('d.status = :status', { status: DeliveryStatus.DELIVERED })
      .select('item.name', 'itemName')
      .addSelect('v.sku', 'sku')
      .addSelect('SUM(dd.quantity)', 'totalQuantity')
      .groupBy('item.id')
      .addGroupBy('item.name')
      .addGroupBy('v.sku')
      .orderBy('SUM(dd.quantity)', 'DESC')
      .limit(take)
      .getRawMany<{ itemName: string; sku: string; totalQuantity: string }>();
  }

  private formatRawAssociateName(row: {
    firstName: string;
    secondName: string | null;
    firstLastName: string;
    secondLastName: string | null;
  }): string {
    return [row.firstName, row.secondName, row.firstLastName, row.secondLastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async create(dto: CreateDeliveryDto, userId: string) {
    if (!dto.associateId && !dto.postId) {
      throw new BadRequestException('Debe indicar associateId o postId');
    }
    if (dto.associateId && dto.postId) {
      throw new BadRequestException('No puede indicar associateId y postId a la vez');
    }

    if (dto.postId) {
      const post = await this.postsRepo.findOne({ where: { id: dto.postId } });
      if (!post) {
        throw new NotFoundException('Puesto no encontrado');
      }
    }

    if (dto.associateId) {
      await this.assertDeliverableAssociate(dto.associateId);
    }

    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.variantsRepo.find({
      where: { id: In(variantIds) },
    });

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('Variante de inventario no encontrada');
    }

    const delivery = await this.deliveriesRepo.save(
      this.deliveriesRepo.create({
        associateId: dto.associateId ?? null,
        postId: dto.postId ?? null,
        observations: dto.observations ?? null,
        status: DeliveryStatus.PENDING,
        createdBy: userId,
      }),
    );

    await this.detailsRepo.save(
      dto.items.map((i) =>
        this.detailsRepo.create({
          deliveryId: delivery.id,
          variantId: i.variantId,
          quantity: i.quantity,
        }),
      ),
    );

    await this.auditService.log({
      userId,
      module: 'deliveries',
      action: dto.postId ? 'delivery.post.create' : 'delivery.create',
      entityType: 'delivery',
      entityId: delivery.id,
      newValue: dto as unknown as Record<string, unknown>,
    });

    return this.deliveriesRepo.findOne({
      where: { id: delivery.id },
      relations: { details: true },
    });
  }

  async sign(id: string, dto: SignDeliveryDto, userId: string) {
    const delivery = await this.deliveriesRepo.findOne({
      where: { id },
      relations: { details: true },
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new ConflictException('Solo se pueden firmar entregas pendientes');
    }

    const signatureUrl = await this.uploadSignature(id, dto.signatureData);

    for (const detail of delivery.details) {
      const variant = await this.variantsRepo.findOne({ where: { id: detail.variantId } });
      if (!variant) {
        throw new NotFoundException('Variante de inventario no encontrada');
      }
      if (detail.quantity > variant.stockCurrent) {
        throw new ConflictException('Stock insuficiente para confirmar entrega');
      }
      variant.stockCurrent -= detail.quantity;
      await this.variantsRepo.save(variant);
    }

    const oldStatus = delivery.status;
    delivery.signatureUrl = signatureUrl;
    delivery.status = DeliveryStatus.DELIVERED;
    delivery.isImmutable = true;
    delivery.deliveredAt = new Date();
    await this.deliveriesRepo.save(delivery);

    await this.auditService.log({
      userId,
      module: 'deliveries',
      action: 'delivery.confirmed',
      entityType: 'delivery',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: delivery.status, signatureUrl },
    });

    return delivery;
  }

  async revert(id: string, dto: RevertDeliveryDto, userId: string) {
    const delivery = await this.deliveriesRepo.findOne({
      where: { id },
      relations: { details: true },
    });

    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }

    if (delivery.status === DeliveryStatus.REVERTED) {
      throw new ConflictException('Esta entrega ya está revertida');
    }

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      throw new ConflictException('Solo se pueden revertir entregas confirmadas');
    }

    if (!delivery.deliveredAt) {
      throw new BadRequestException('La entrega no tiene fecha de confirmación');
    }

    const hoursSinceDelivery =
      (Date.now() - delivery.deliveredAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDelivery > REVERT_WINDOW_HOURS) {
      const hoursElapsed = Math.floor(hoursSinceDelivery);
      throw new BadRequestException(
        `No se puede revertir esta entrega. Han transcurrido ${hoursElapsed} horas. Solo se pueden revertir entregas de los últimos 5 días.`,
      );
    }

    for (const detail of delivery.details) {
      const variant = await this.variantsRepo.findOne({ where: { id: detail.variantId } });
      if (!variant) {
        throw new NotFoundException('Variante de inventario no encontrada');
      }
      variant.stockCurrent += detail.quantity;
      await this.variantsRepo.save(variant);
    }

    const oldStatus = delivery.status;
    delivery.status = DeliveryStatus.REVERTED;
    delivery.revertedAt = new Date();
    delivery.revertedBy = userId;
    delivery.revertReason = dto.reason.trim();
    await this.deliveriesRepo.save(delivery);

    await this.auditService.log({
      userId,
      module: 'deliveries',
      action: 'delivery.revert',
      entityType: 'delivery',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: {
        status: delivery.status,
        revertReason: delivery.revertReason,
        stockRestored: delivery.details.map((d) => ({
          variantId: d.variantId,
          quantity: d.quantity,
        })),
      },
    });

    return delivery;
  }

  private async uploadSignature(deliveryId: string, signatureData: string): Promise<string> {
    const base64 = this.extractBase64(signatureData);
    const fileBuffer = Buffer.from(base64, 'base64');
    const bucket = this.config.get<string>('SUPABASE_SIGNATURE_BUCKET', 'delivery-signatures');
    const filePath = `${deliveryId}/${Date.now()}.png`;

    try {
      return await this.supabaseStorage.uploadPublicObject(
        bucket,
        filePath,
        fileBuffer,
        'image/png',
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido';
      throw new BadRequestException(`No se pudo subir firma: ${reason}`);
    }
  }

  private extractBase64(signatureData: string): string {
    const marker = 'base64,';
    const markerIndex = signatureData.indexOf(marker);
    if (markerIndex >= 0) {
      return signatureData.slice(markerIndex + marker.length);
    }
    return signatureData;
  }

  private async assertDeliverableAssociate(associateId: string): Promise<Associate> {
    const associate = await this.associatesRepo.findOne({ where: { id: associateId } });
    if (!associate) {
      throw new NotFoundException('Asociado no encontrado');
    }
    if (!DELIVERABLE_STATUSES.includes(associate.status)) {
      throw new BadRequestException(
        `No se puede entregar dotación a un asociado en estado ${associate.status}. Solo ACTIVO o VACACIONES.`,
      );
    }
    return associate;
  }
}
