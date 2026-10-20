import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { ShiftSchedule } from '../scheduling/entities/shift-schedule.entity';
import { PayrollPeriod } from './entities/payroll-period.entity';
import { PayrollSlipDetail } from './entities/payroll-slip-detail.entity';
import { PayrollSlip } from './entities/payroll-slip.entity';
import { ConversionAdmonController } from './conversion/conversion-admon.controller';
import { ConversionAdmonService } from './conversion/conversion-admon.service';
import { PayrollConversionController } from './conversion/conversion.controller';
import { PayrollConversionService } from './conversion/conversion.service';
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
  ],
  controllers: [PayrollsController, PayrollConversionController, ConversionAdmonController],
  providers: [PayrollsService, PayrollConversionService, ConversionAdmonService],
  exports: [PayrollsService],
})
export class PayrollsModule {}
