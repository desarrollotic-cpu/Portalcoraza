import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { JobPosition } from './entities/job-position.entity';
import { HrPositionsController } from './hr-positions.controller';
import { HrPositionsService } from './hr-positions.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobPosition]), AuditModule],
  controllers: [HrPositionsController],
  providers: [HrPositionsService],
  exports: [HrPositionsService],
})
export class HrPositionsModule {}
