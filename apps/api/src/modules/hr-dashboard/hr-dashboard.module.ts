import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { HrSharedModule } from '../hr-shared/hr-shared.module';
import { Retirement } from '../hr-retirements/entities/retirement.entity';
import { HrAuditController } from './hr-audit.controller';
import { HrDashboardController } from './hr-dashboard.controller';
import { HrDashboardService } from './hr-dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Associate, Retirement]),
    HrSharedModule,
  ],
  controllers: [HrDashboardController, HrAuditController],
  providers: [HrDashboardService],
})
export class HrDashboardModule {}
