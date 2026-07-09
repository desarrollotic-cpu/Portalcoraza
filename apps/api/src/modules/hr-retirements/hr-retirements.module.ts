import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssociatesModule } from '../associates/associates.module';
import { Associate } from '../associates/entities/associate.entity';
import { HrSharedModule } from '../hr-shared/hr-shared.module';
import { Retirement } from './entities/retirement.entity';
import { HrRetirementsController } from './hr-retirements.controller';
import { HrRetirementsService } from './hr-retirements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Retirement, Associate]),
    HrSharedModule,
    AssociatesModule,
  ],
  controllers: [HrRetirementsController],
  providers: [HrRetirementsService],
  exports: [HrRetirementsService],
})
export class HrRetirementsModule {}
