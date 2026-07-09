import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssociateHistory } from '../associates/entities/associate-history.entity';
import { AuditModule } from '../audit/audit.module';
import { AssociateDerivedService } from './services/associate-derived.service';
import { HrAuditService } from './services/hr-audit.service';
import { SensitiveDataService } from './services/sensitive-data.service';

/**
 * Utilidades compartidas del módulo HRM (auditoría campo-a-campo, cálculo de
 * campos derivados y enmascaramiento Ley 1581). Se exportan para que
 * cualquier módulo del bounded context `hr` las inyecte.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AssociateHistory]), AuditModule],
  providers: [HrAuditService, AssociateDerivedService, SensitiveDataService],
  exports: [HrAuditService, AssociateDerivedService, SensitiveDataService],
})
export class HrSharedModule {}
