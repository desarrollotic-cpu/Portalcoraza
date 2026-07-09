import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { Associate } from '../associates/entities/associate.entity';
import { InventoryVariant } from '../inventory/entities/inventory-variant.entity';
import { Post } from '../posts/entities/post.entity';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery } from './entities/delivery.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Delivery, DeliveryDetail, InventoryVariant, Post, Associate]),
    AuditModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, SupabaseStorageService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
