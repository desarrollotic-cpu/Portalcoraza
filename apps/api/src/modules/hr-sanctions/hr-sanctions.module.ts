import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditModule } from '../audit/audit.module';
import { Organization } from '../organizations/entities/organization.entity';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { DisciplinaryNumeral, DisciplinarySanction } from './entities/disciplinary.entities';
import { HrSanctionsController } from './hr-sanctions.controller';
import { HrSanctionsCron } from './hr-sanctions.cron';
import { HrSanctionsService } from './hr-sanctions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisciplinaryNumeral, DisciplinarySanction, Associate, Organization]),
    AuditModule,
    SchedulingModule,
  ],
  controllers: [HrSanctionsController],
  providers: [HrSanctionsService, HrSanctionsCron],
})
export class HrSanctionsModule {}
