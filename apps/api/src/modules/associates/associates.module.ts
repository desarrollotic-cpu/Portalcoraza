import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Retirement } from '../hr-retirements/entities/retirement.entity';
import { HrSharedModule } from '../hr-shared/hr-shared.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssociatesController } from './associates.controller';
import { AssociatesService } from './associates.service';
import { AssociateHistory } from './entities/associate-history.entity';
import { Associate } from './entities/associate.entity';
import { PositionHistory } from './entities/position-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Associate, AssociateHistory, PositionHistory, Retirement]),
    HrSharedModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AssociatesController],
  providers: [AssociatesService],
  exports: [AssociatesService],
})
export class AssociatesModule {}
