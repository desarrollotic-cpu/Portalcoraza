import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../users/entities/user.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryCategory } from './entities/inventory-category.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { InventoryVariant } from './entities/inventory-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryCategory,
      InventoryItem,
      InventoryVariant,
      InventoryMovement,
      User,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
