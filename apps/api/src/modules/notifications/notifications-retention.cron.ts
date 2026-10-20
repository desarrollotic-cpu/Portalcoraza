import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { APP_TIMEZONE } from '../../common/constants/app-timezone';
import {
  NOTIFICATIONS_RETENTION_DAYS,
  NOTIFICATIONS_UNREAD_RETENTION_DAYS,
  NotificationsService,
} from './notifications.service';

/**
 * Purga diaria del listado de notificaciones, que nunca se limpiaba y crecía
 * sin tope. Mismo patrón que `AuditRetentionCron`.
 *
 * Corre a las 4:30, media hora después de la purga de auditoría, para no
 * competir por el pool de conexiones de Supabase (máximo 5).
 */
@Injectable()
export class NotificationsRetentionCron {
  private readonly logger = new Logger(NotificationsRetentionCron.name);

  constructor(private readonly notifications: NotificationsService) {}

  @Cron('30 4 * * *', {
    name: 'notifications-retention-daily',
    timeZone: APP_TIMEZONE,
  })
  async handleDailyPurge() {
    this.logger.log(
      `Purga de notificaciones (leídas >${NOTIFICATIONS_RETENTION_DAYS}d, sin leer >${NOTIFICATIONS_UNREAD_RETENTION_DAYS}d)`,
    );
    try {
      const result = await this.notifications.purgeOld();
      this.logger.log(`Purga completada ${JSON.stringify(result)}`);
    } catch (err) {
      // Nunca debe tumbar la app: si falla, se reintenta al día siguiente.
      this.logger.error('Error en purga de notificaciones', err as Error);
    }
  }
}
