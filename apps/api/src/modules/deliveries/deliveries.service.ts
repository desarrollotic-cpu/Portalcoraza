import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { InventoryVariant } from '../inventory/entities/inventory-variant.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { SignDeliveryDto } from './dto/sign-delivery.dto';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveriesRepo: Repository<Delivery>,
    @InjectRepository(DeliveryDetail)
    private readonly detailsRepo: Repository<DeliveryDetail>,
    @InjectRepository(InventoryVariant)
    private readonly variantsRepo: Repository<InventoryVariant>,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async list(associateId?: string) {
    return this.deliveriesRepo.find({
      where: associateId ? { associateId } : {},
      relations: { details: true },
      order: { createdAt: 'DESC' },
    });
  }

  async create(dto: CreateDeliveryDto, userId: string) {
    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.variantsRepo.find({
      where: { id: In(variantIds) },
    });

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('Variante de inventario no encontrada');
    }

    const delivery = await this.deliveriesRepo.save(
      this.deliveriesRepo.create({
        associateId: dto.associateId,
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
      action: 'delivery.create',
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

    if (delivery.status === DeliveryStatus.DELIVERED || delivery.isImmutable) {
      throw new ConflictException('La entrega ya fue confirmada y es inmutable');
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

  private async uploadSignature(deliveryId: string, signatureData: string): Promise<string> {
    const base64 = this.extractBase64(signatureData);
    const fileBuffer = Buffer.from(base64, 'base64');

    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const bucket = this.config.get<string>('SUPABASE_SIGNATURE_BUCKET', 'delivery-signatures');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new BadRequestException('Configuracion Supabase incompleta para firmas');
    }

    const filePath = `${deliveryId}/${Date.now()}.png`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const reason = await uploadRes.text();
      throw new BadRequestException(`No se pudo subir firma: ${reason}`);
    }

    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
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
