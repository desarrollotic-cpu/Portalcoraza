import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HrAlertsService } from './hr-alerts.service';

/**
 * Cron diario del módulo Gestión Humana.
 *
 * Se ejecuta todos los días a las 03:00 (hora del servidor).
 *   1) Marca como resueltas las alertas de asociados que ya no están ACTIVOS.
 *   2) Regenera todas las alertas de vencimiento (60/30/7 días) y de
 *      documentos faltantes en cargos críticos.
 *   3) Notifica al rol SST y RRHH si se crean nuevas alertas.
 */
@Injectable()
export class HrAlertsCron {
  private readonly logger = new Logger(HrAlertsCron.name);

  constructor(private readonly alerts: HrAlertsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'hr-alerts-daily' })
  async handleDailyAlerts() {
    this.logger.log('Ejecutando motor de alertas HRM (diario)');
    try {
      await this.alerts.cleanupStale();
      const summary = await this.alerts.generateAll();
      this.logger.log(`Motor de alertas completado: ${JSON.stringify(summary)}`);
    } catch (err) {
      this.logger.error('Error ejecutando motor de alertas HRM', err as Error);
    }
  }
}
