import { Module } from '@nestjs/common';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MotorJobsController } from './motor.jobs.controller';
import { MotorQueueService } from './motor.queue.service';

@Module({
  imports: [SchedulingModule],
  controllers: [MotorJobsController],
  providers: [MotorQueueService],
  exports: [MotorQueueService],
})
export class QueuesModule {}

