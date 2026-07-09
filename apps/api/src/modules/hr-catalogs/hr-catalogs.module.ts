import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CatalogValue } from './entities/catalog-value.entity';
import { HrCatalogsController } from './hr-catalogs.controller';
import { HrCatalogsService } from './hr-catalogs.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogValue]), AuditModule],
  controllers: [HrCatalogsController],
  providers: [HrCatalogsService],
  exports: [HrCatalogsService],
})
export class HrCatalogsModule {}
