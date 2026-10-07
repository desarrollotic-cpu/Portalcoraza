import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AUDIT_RETENTION_DAYS, AuditService } from './audit.service';

@Injectable()
export class AuditRetentionCron {
  private readonly logger = new Logger(AuditRetentionCron.name);

  constructor(private readonly audit: AuditService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'audit-retention-daily' })
  async handleDailyPurge() {
    this.logger.log(
      `Purga historial (>${AUDIT_RETENTION_DAYS}d): movimientos + actividades (audit, HR, radio)`,
    );
    try {
      const result = await this.audit.purgeOlderThanDays(AUDIT_RETENTION_DAYS);
      this.logger.log(`Purga completada ${JSON.stringify(result)}`);
    } catch (err) {
      this.logger.error('Error en purga de historial', err as Error);
    }
  }
}
