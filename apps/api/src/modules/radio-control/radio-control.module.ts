import { Module } from '@nestjs/common';
import { MinutaModule } from '../minuta/minuta.module';
import { RadioControlController } from './radio-control.controller';
import { RadioControlService } from './radio-control.service';

@Module({
  imports: [MinutaModule],
  controllers: [RadioControlController],
  providers: [RadioControlService],
})
export class RadioControlModule {}
