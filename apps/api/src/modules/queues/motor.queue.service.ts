import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { motorDedupeKey, MOTOR_GLOBAL_JOB_NAME, MOTOR_GLOBAL_QUEUE } from './motor.constants';
import {
  MotorCiclo,
  MotorGlobalJobData,
  MotorGlobalJobResult,
  MotorGlobalProgress,
  MotorJobStatusDto,
} from './motor.types';

@Injectable()
export class MotorQueueService {
  constructor(
    @InjectQueue(MOTOR_GLOBAL_QUEUE) private readonly queue: Queue<MotorGlobalJobData>,
  ) {}

  async enqueue(input: {
    tenantId: string;
    year: number;
    month: number;
    tipoCiclo?: MotorCiclo;
    createMissing?: boolean;
    userId: string;
  }): Promise<{ jobId: string; status: 'queued' }> {
    const tipoCiclo = input.tipoCiclo ?? '12x3';
    const jobId = motorDedupeKey(
      input.tenantId,
      input.year,
      input.month,
      tipoCiclo,
    );

    const existing = await this.queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        throw new ConflictException({
          message: 'Ya hay un motor global en cola o en ejecución para este mes',
          jobId,
          status: state,
        });
      }
      await existing.remove();
    }

    const data: MotorGlobalJobData = {
      tenantId: input.tenantId,
      year: input.year,
      month: input.month,
      tipoCiclo,
      createMissing: Boolean(input.createMissing),
      userId: input.userId,
      requestedAt: new Date().toISOString(),
    };

    await this.queue.add(MOTOR_GLOBAL_JOB_NAME, data, {
      jobId,
      removeOnComplete: { age: 3600, count: 50 },
      removeOnFail: { age: 86400, count: 100 },
    });

    return { jobId, status: 'queued' };
  }

  async getStatus(jobId: string, tenantId: string): Promise<MotorJobStatusDto> {
    const job = await this.queue.getJob(jobId);
    if (!job || job.data.tenantId !== tenantId) {
      throw new NotFoundException('Job no encontrado');
    }

    const state = await job.getState();
    const progress = normalizeProgress(job.progress);
    let status: MotorJobStatusDto['status'] = 'unknown';
    if (
      state === 'waiting' ||
      state === 'delayed' ||
      state === 'prioritized' ||
      state === 'waiting-children'
    ) {
      status = 'queued';
    } else if (state === 'active') {
      status = 'active';
    } else if (state === 'completed') {
      status = 'completed';
    } else if (state === 'failed') {
      status = 'failed';
    }

    return {
      jobId,
      status,
      progress,
      result: (job.returnvalue as MotorGlobalJobResult | null) ?? null,
      failedReason: job.failedReason ?? null,
    };
  }
}

function normalizeProgress(raw: unknown): MotorGlobalProgress | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<MotorGlobalProgress>;
  if (
    typeof p.processed !== 'number' ||
    typeof p.total !== 'number' ||
    typeof p.ok !== 'number' ||
    typeof p.failed !== 'number'
  ) {
    return null;
  }
  return {
    processed: p.processed,
    total: p.total,
    ok: p.ok,
    failed: p.failed,
  };
}
