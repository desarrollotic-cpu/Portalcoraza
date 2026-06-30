import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, FindOptionsWhere } from 'typeorm';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { AuditService } from '../audit/audit.service';
import { InventoryVariant } from '../inventory/entities/inventory-variant.entity';
import { Post } from '../posts/entities/post.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { RevertDeliveryDto } from './dto/revert-delivery.dto';
import { SignDeliveryDto } from './dto/sign-delivery.dto';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';

const REVERT_WINDOW_HOURS = 120;

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
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly supabaseStorage: SupabaseStorageService,
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
      relations: { details: true },
      order: { createdAt: 'DESC' },
    });
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
}
