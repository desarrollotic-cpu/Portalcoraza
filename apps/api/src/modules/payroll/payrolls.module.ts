import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { ShiftSchedule } from '../scheduling/entities/shift-schedule.entity';
import { AccountingModule } from '../accounting/accounting.module';
import { PayrollPeriod } from './entities/payroll-period.entity';
import { PayrollSlipDetail } from './entities/payroll-slip-detail.entity';
import { PayrollSlip } from './entities/payroll-slip.entity';
import { PayrollsController } from './payrolls.controller';
import { PayrollsService } from './payrolls.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollPeriod,
      PayrollSlip,
      PayrollSlipDetail,
      Associate,
      ShiftSchedule,
    ]),
    AccountingModule,
  ],
  controllers: [PayrollsController],
  providers: [PayrollsService],
  exports: [PayrollsService],
})
export class PayrollsModule {}
