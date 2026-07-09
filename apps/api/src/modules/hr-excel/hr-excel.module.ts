import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditModule } from '../audit/audit.module';
import { CatalogValue } from '../hr-catalogs/entities/catalog-value.entity';
import { JobPosition } from '../hr-positions/entities/job-position.entity';
import { WorkCenter } from '../hr-work-centers/entities/work-center.entity';
import { HrExcelController } from './hr-excel.controller';
import { HrExcelService } from './hr-excel.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Associate, JobPosition, WorkCenter, CatalogValue]),
    AuditModule,
  ],
  controllers: [HrExcelController],
  providers: [HrExcelService],
})
export class HrExcelModule {}
