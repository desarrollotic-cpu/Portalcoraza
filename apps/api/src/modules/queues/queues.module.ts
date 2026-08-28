import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common';
import {
  getRedisConnectionOptions,
  isRedisConfigured,
} from '../../config/redis.config';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MOTOR_GLOBAL_QUEUE } from './motor.constants';
import { MotorJobsController } from './motor.jobs.controller';
import { MotorProcessor } from './motor.processor';
import { MotorQueueInMemoryService } from './motor.queue.in-memory.service';
import { MotorQueueService } from './motor.queue.service';

@Module({})
export class QueuesModule implements OnModuleInit {
  private readonly logger = new Logger(QueuesModule.name);

  static register(): DynamicModule {
    const base = {
      module: QueuesModule,
      controllers: [MotorJobsController],
      exports: [MotorQueueService],
    };

    if (!isRedisConfigured()) {
      return {
        ...base,
        imports: [SchedulingModule],
        providers: [
          { provide: MotorQueueService, useClass: MotorQueueInMemoryService },
        ],
      };
    }

    const connection = getRedisConnectionOptions()!;
    return {
      ...base,
      imports: [
        BullModule.forRoot({ connection }),
        BullModule.registerQueue({ name: MOTOR_GLOBAL_QUEUE }),
        SchedulingModule,
      ],
      providers: [MotorProcessor, MotorQueueService],
    };
  }

  onModuleInit() {
    if (isRedisConfigured()) {
      this.logger.log('Redis OK — motor-global con BullMQ');
    } else {
      this.logger.warn('REDIS_URL ausente — motor-global in-memory (dev/single instance)');
    }
  }
}
