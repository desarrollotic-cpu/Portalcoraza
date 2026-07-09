import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditModule } from '../audit/audit.module';
import { AssociateDocument } from '../hr-documents/entities/associate-document.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { HrAlert } from './entities/hr-alert.entity';
import { HrAlertsController } from './hr-alerts.controller';
import { HrAlertsCron } from './hr-alerts.cron';
import { HrAlertsService } from './hr-alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([HrAlert, Associate, AssociateDocument]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [HrAlertsController],
  providers: [HrAlertsService, HrAlertsCron],
  exports: [HrAlertsService],
})
export class HrAlertsModule {}
