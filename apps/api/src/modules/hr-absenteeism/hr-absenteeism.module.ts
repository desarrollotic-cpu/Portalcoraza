import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Associate } from '../associates/entities/associate.entity';
import { AssociateAbsence } from './entities/associate-absence.entity';
import { DiagnosisCie10 } from './entities/diagnosis-cie10.entity';
import { HrAbsenteeismController } from './hr-absenteeism.controller';
import { HrAbsenteeismService } from './hr-absenteeism.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssociateAbsence, DiagnosisCie10, Associate]),
    AuditModule,
  ],
  controllers: [HrAbsenteeismController],
  providers: [HrAbsenteeismService],
  exports: [HrAbsenteeismService],
})
export class HrAbsenteeismModule {}
