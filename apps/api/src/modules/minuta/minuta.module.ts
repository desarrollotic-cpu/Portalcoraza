import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MinutaContratista,
  MinutaCorrespondencia,
  MinutaDomiciliario,
  MinutaEntregaPuesto,
  MinutaIncidente,
  MinutaServicio,
  MinutaVisitante,
} from './entities/minuta.entities';
import { MinutaController } from './minuta.controller';
import { MinutaSchemaBootstrap } from './minuta-schema.bootstrap';
import { MinutaService } from './minuta.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MinutaVisitante,
      MinutaCorrespondencia,
      MinutaContratista,
      MinutaDomiciliario,
      MinutaIncidente,
      MinutaServicio,
      MinutaEntregaPuesto,
    ]),
  ],
  controllers: [MinutaController],
  providers: [MinutaService, MinutaSchemaBootstrap],
})
export class MinutaModule {}
