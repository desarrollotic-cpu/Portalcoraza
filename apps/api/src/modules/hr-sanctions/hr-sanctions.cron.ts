import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { APP_TIMEZONE } from '../../common/constants/app-timezone';
import { runWithTenantContext } from '../../common/tenant/run-with-tenant';
import { Organization } from '../organizations/entities/organization.entity';
import { HrSanctionsService } from './hr-sanctions.service';

/**
 * Suspende y reactiva solo: 00:05 hora Colombia, y una vez al arrancar para
 * recuperar lo que se haya quedado pendiente si el servidor estuvo caído.
 */
@Injectable()
export class HrSanctionsCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(HrSanctionsCron.name);

  constructor(
    private readonly sanctions: HrSanctionsService,
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
  ) {}

  onApplicationBootstrap() {
    void this.run();
  }

  @Cron('5 0 * * *', { name: 'hr-sanctions-daily', timeZone: APP_TIMEZONE })
  async run() {
    try {
      const orgs = await this.orgs.find({ where: { activo: true }, select: ['id'] });
      for (const org of orgs) {
        try {
          await runWithTenantContext(org.id, () => this.sanctions.sync());
        } catch (err) {
          this.logger.error(`Sanciones: error en tenant ${org.id}`, err as Error);
        }
      }
    } catch (err) {
      this.logger.error('Sanciones: no se pudo sincronizar', err as Error);
    }
  }
}
