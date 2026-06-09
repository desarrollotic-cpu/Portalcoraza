import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { ShiftSchedule } from './entities/shift-schedule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftSchedule]), AuditModule],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
