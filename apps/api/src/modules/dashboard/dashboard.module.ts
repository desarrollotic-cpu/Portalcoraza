import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { DocumentalModule } from '../documental/documental.module';
import { HrDashboardModule } from '../hr-dashboard/hr-dashboard.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReceptionModule } from '../reception/reception.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { UsersModule } from '../users/users.module';
import { DashboardCommandCenterService } from './dashboard-command-center.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    HrDashboardModule,
    DeliveriesModule,
    InventoryModule,
    ReceptionModule,
    SchedulingModule,
    DocumentalModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardCommandCenterService],
})
export class DashboardModule {}
