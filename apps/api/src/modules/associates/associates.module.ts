import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrSharedModule } from '../hr-shared/hr-shared.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssociatesController } from './associates.controller';
import { AssociatesService } from './associates.service';
import { AssociateHistory } from './entities/associate-history.entity';
import { Associate } from './entities/associate.entity';
import { PositionHistory } from './entities/position-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Associate, AssociateHistory, PositionHistory]),
    HrSharedModule,
    NotificationsModule,
  ],
  controllers: [AssociatesController],
  providers: [AssociatesService],
  exports: [AssociatesService],
})
export class AssociatesModule {}
