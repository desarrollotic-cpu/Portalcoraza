import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import {
  getRedisConnectionOptions,
  isRedisConfigured,
} from '../../config/redis.config';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { MOTOR_GLOBAL_QUEUE } from './motor.constants';
import { MotorJobsController } from './motor.jobs.controller';
import { MotorProcessor } from './motor.processor';
import { MotorQueueService } from './motor.queue.service';
import { MotorQueueServiceDisabled } from './motor.queue.service.disabled';

// ConfigModule.forRoot ya carga .env; refuerzo por si register() corre aislado.
loadEnv();

@Module({})
export class QueuesModule implements OnModuleInit {
  private readonly logger = new Logger(QueuesModule.name);

  static register(): DynamicModule {
    if (!isRedisConfigured()) {
      return {
        module: QueuesModule,
        controllers: [MotorJobsController],
        providers: [
          { provide: MotorQueueService, useClass: MotorQueueServiceDisabled },
        ],
        exports: [MotorQueueService],
      };
    }

    const connection = getRedisConnectionOptions()!;
    return {
      module: QueuesModule,
      imports: [
        BullModule.forRoot({ connection }),
        BullModule.registerQueue({ name: MOTOR_GLOBAL_QUEUE }),
        SchedulingModule,
      ],
      controllers: [MotorJobsController],
      providers: [MotorProcessor, MotorQueueService],
      exports: [MotorQueueService],
    };
  }

  onModuleInit() {
    if (isRedisConfigured()) {
      this.logger.log(
        'Redis OK — cola motor-global activa (BullMQ mismo proceso Nest)',
      );
    } else {
      this.logger.warn(
        'REDIS_URL ausente — motor-global async deshabilitado (503 al encolar)',
      );
    }
  }
}
