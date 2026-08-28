import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { runWithTenantContext } from '../../common/tenant/run-with-tenant';
import { Organization } from '../organizations/entities/organization.entity';
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

  constructor(
    private readonly alerts: HrAlertsService,
    @InjectRepository(Organization)
    private readonly orgsRepo: Repository<Organization>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'hr-alerts-daily' })
  async handleDailyAlerts() {
    this.logger.log('Ejecutando motor de alertas HRM (diario, por tenant)');
    const orgs = await this.orgsRepo.find({ where: { activo: true }, select: ['id'] });

    for (const org of orgs) {
      try {
        await runWithTenantContext(org.id, async () => {
          await this.alerts.cleanupStale();
          const summary = await this.alerts.generateAll();
          this.logger.log(
            `Tenant ${org.id}: motor de alertas completado ${JSON.stringify(summary)}`,
          );
        });
      } catch (err) {
        this.logger.error(`Error motor alertas tenant ${org.id}`, err as Error);
      }
    }
  }
}
