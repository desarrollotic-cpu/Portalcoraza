import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  MotorCiclo,
  MotorJobStatusDto,
} from './motor.types';

/** Usado cuando REDIS_URL no está definido. */
@Injectable()
export class MotorQueueServiceDisabled {
  assertRedis(): never {
    throw new ServiceUnavailableException(
      'REDIS_URL no configurado: el motor global async no está disponible',
    );
  }

  enqueue(_input: {
    tenantId: string;
    year: number;
    month: number;
    tipoCiclo?: MotorCiclo;
    createMissing?: boolean;
    userId: string;
  }): Promise<{ jobId: string; status: 'queued' }> {
    this.assertRedis();
  }

  getStatus(_jobId: string, _tenantId: string): Promise<MotorJobStatusDto> {
    this.assertRedis();
  }
}
