import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { WorkCenter } from './entities/work-center.entity';
import { HrWorkCentersController } from './hr-work-centers.controller';
import { HrWorkCentersService } from './hr-work-centers.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkCenter]), AuditModule],
  controllers: [HrWorkCentersController],
  providers: [HrWorkCentersService],
  exports: [HrWorkCentersService],
})
export class HrWorkCentersModule {}
