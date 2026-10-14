import { Injectable, NotFoundException } from '@nestjs/common';
import { runWithTenantContext } from '../../common/tenant/run-with-tenant';
import { MonthlySchedulingService } from '../scheduling/monthly-scheduling.service';
import { motorDedupeKey } from './motor.constants';
import { MotorCiclo, MotorJobStatusDto } from './motor.types';

interface InMemoryJob {
  jobId: string;
  tenantId: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  progress: { processed: number; total: number; ok: number; failed: number } | null;
  result: unknown | null;
  failedReason: string | null;
  /** Momento en que el job terminó; null mientras sigue activo. */
  finishedAt: number | null;
}

/** Un job terminado se conserva solo mientras el front consulta su estado. */
const JOB_RETENTION_MS = 30 * 60 * 1000;

/** Tope duro: evita que el Map crezca sin límite si algo deja jobs colgados. */
const MAX_JOBS = 100;

/** ponytail: fallback sin REDIS_URL; escalar → BullMQ en motor.queue.service.ts */
@Injectable()
export class MotorQueueInMemoryService {
  private readonly jobs = new Map<string, InMemoryJob>();

  constructor(private readonly schedulingService: MonthlySchedulingService) {}

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

    const job: InMemoryJob = {
      jobId,
      tenantId: input.tenantId,
      status: 'active',
      progress: { processed: 0, total: 0, ok: 0, failed: 0 },
      result: null,
      failedReason: null,
      finishedAt: null,
    };
    this.purgeExpired();
    this.jobs.set(jobId, job);

    setImmediate(() => {
      void runWithTenantContext(input.tenantId, async () => {
        try {
          const results = await this.schedulingService.generateMotorGlobal(
            {
              year: input.year,
              month: input.month,
              tipoCiclo,
              createMissing: Boolean(input.createMissing),
            },
            input.userId,
            (prog) => {
              job.progress = prog;
            },
          );
          job.status = 'completed';
          job.result = { ok: true, results };
        } catch (err: unknown) {
          job.status = 'failed';
          job.failedReason =
            err instanceof Error ? err.message : 'Error en motor global';
        } finally {
          job.finishedAt = Date.now();
        }
      });
    });

    return { jobId, status: 'queued' };
  }

  /**
   * Suelta los jobs terminados: sin esto el Map crece indefinidamente y cada
   * entrada retiene el resultado completo del motor hasta reiniciar el proceso.
   */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (job.finishedAt !== null && now - job.finishedAt > JOB_RETENTION_MS) {
        this.jobs.delete(id);
      }
    }

    // Si aún hay exceso, descarta los terminados más antiguos primero.
    if (this.jobs.size >= MAX_JOBS) {
      const finished = [...this.jobs.values()]
        .filter((j) => j.finishedAt !== null)
        .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
      for (const job of finished) {
        if (this.jobs.size < MAX_JOBS) break;
        this.jobs.delete(job.jobId);
      }
    }
  }

  async getStatus(jobId: string, tenantId: string): Promise<MotorJobStatusDto> {
    const job = this.jobs.get(jobId);
    if (!job || job.tenantId !== tenantId) {
      throw new NotFoundException('Job no encontrado');
    }

    return {
      jobId,
      status: job.status,
      progress: job.progress,
      result: job.result as MotorJobStatusDto['result'],
      failedReason: job.failedReason,
    };
  }
}
