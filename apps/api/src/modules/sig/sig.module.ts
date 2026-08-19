import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SigIndicador,
  SigObjetivo,
  SigResultado,
  SigSistema,
} from './entities/sig.entities';
import { SigController } from './sig.controller';
import { SigSchemaBootstrap } from './sig-schema.bootstrap';
import { SigService } from './sig.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SigSistema,
      SigObjetivo,
      SigIndicador,
      SigResultado,
    ]),
  ],
  controllers: [SigController],
  providers: [SigService, SigSchemaBootstrap],
})
export class SigModule {}
