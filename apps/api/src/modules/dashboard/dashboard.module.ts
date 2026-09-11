import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { DeliveriesModule } from '../deliveries/deliveries.module';
import { DocumentalModule } from '../documental/documental.module';
import { HrDashboardModule } from '../hr-dashboard/hr-dashboard.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PostsModule } from '../posts/posts.module';
import { ReceptionModule } from '../reception/reception.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ActivityControlService } from './activity-control.service';
import { DashboardCommandCenterService } from './dashboard-command-center.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, User]),
    HrDashboardModule,
    DeliveriesModule,
    InventoryModule,
    ReceptionModule,
    SchedulingModule,
    DocumentalModule,
    UsersModule,
    AuditModule,
    PostsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardCommandCenterService, ActivityControlService],
})
export class DashboardModule {}
