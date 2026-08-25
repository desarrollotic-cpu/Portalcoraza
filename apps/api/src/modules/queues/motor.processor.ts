import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { runWithTenantContext } from '../../common/tenant/run-with-tenant';
import { MonthlySchedulingService } from '../scheduling/monthly-scheduling.service';
import { MOTOR_GLOBAL_QUEUE } from './motor.constants';
import { MotorGlobalJobData, MotorGlobalJobResult } from './motor.types';

@Processor(MOTOR_GLOBAL_QUEUE, {
  // Un job a la vez: el motor es pesado en DB; no saturar el pooler.
  concurrency: 1,
})
export class MotorProcessor extends WorkerHost {
  private readonly logger = new Logger(MotorProcessor.name);

  constructor(
    private readonly monthlyScheduling: MonthlySchedulingService,
  ) {
    super();
  }

  async process(
    job: Job<MotorGlobalJobData, MotorGlobalJobResult>,
  ): Promise<MotorGlobalJobResult> {
    const { tenantId, year, month, tipoCiclo, createMissing, userId } =
      job.data;
    this.logger.log(
      `Motor global start job=${job.id} tenant=${tenantId} ${year}-${month} ${tipoCiclo}`,
    );

    return runWithTenantContext(tenantId, async () => {
      const result = await this.monthlyScheduling.generateMotorGlobal(
        { year, month, tipoCiclo, createMissing },
        userId,
        async (progress) => {
          await job.updateProgress(progress);
        },
      );
      this.logger.log(
        `Motor global done job=${job.id} ok=${result.ok}/${result.processed}`,
      );
      return {
        year: result.year,
        month: result.month,
        tipoCiclo: result.tipoCiclo,
        processed: result.processed,
        ok: result.ok,
        failed: result.failed,
      };
    });
  }
}
