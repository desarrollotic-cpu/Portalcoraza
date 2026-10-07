import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RadioControlController } from './radio-control.controller';
import { RadioControlService } from './radio-control.service';

@Module({
  imports: [AuditModule],
  controllers: [RadioControlController],
  providers: [RadioControlService],
})
export class RadioControlModule {}
