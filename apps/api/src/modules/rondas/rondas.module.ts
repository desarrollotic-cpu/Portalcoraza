import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RondasController } from './rondas.controller';
import { RondasSchemaBootstrap } from './rondas-schema.bootstrap';
import { RondasService } from './rondas.service';

@Module({
  imports: [AuthModule],
  controllers: [RondasController],
  providers: [RondasService, RondasSchemaBootstrap],
})
export class RondasModule {}
