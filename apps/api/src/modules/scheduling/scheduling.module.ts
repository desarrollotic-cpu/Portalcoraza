import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { ShiftSchedule } from './entities/shift-schedule.entity';
import { MonthlySchedule } from './entities/monthly-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import { ScheduleTemplate } from './entities/schedule-template.entity';
import { MonthlySchedulingController } from './monthly-scheduling.controller';
import { MonthlySchedulingService } from './monthly-scheduling.service';
import { MotorTurnosService } from './motor-turnos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShiftSchedule,
      MonthlySchedule,
      ScheduleAssignment,
      ScheduleTemplate,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [SchedulingController, MonthlySchedulingController],
  providers: [SchedulingService, MonthlySchedulingService, MotorTurnosService],
  exports: [SchedulingService, MonthlySchedulingService],
})
export class SchedulingModule {}
