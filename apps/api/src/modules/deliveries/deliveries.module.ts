import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InventoryVariant } from '../inventory/entities/inventory-variant.entity';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery } from './entities/delivery.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Delivery, DeliveryDetail, InventoryVariant]),
    AuditModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
