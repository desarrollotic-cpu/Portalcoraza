import { Module } from '@nestjs/common';
import { ScooterInspectionsController } from './scooter-inspections.controller';
import { ScooterInspectionsService } from './scooter-inspections.service';
import { ScooterSchemaBootstrap } from './scooter-schema.bootstrap';

@Module({
  controllers: [ScooterInspectionsController],
  providers: [ScooterInspectionsService, ScooterSchemaBootstrap],
})
export class ScooterInspectionsModule {}
