import { Module } from '@nestjs/common';
import { RadioControlController } from './radio-control.controller';
import { RadioControlService } from './radio-control.service';

@Module({
  controllers: [RadioControlController],
  providers: [RadioControlService],
})
export class RadioControlModule {}
