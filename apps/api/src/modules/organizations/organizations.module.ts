import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Copropiedad } from './entities/copropiedad.entity';
import { Organization } from './entities/organization.entity';

/** Solo entidades; sin controladores ni lógica de negocio aún. */
@Module({
  imports: [TypeOrmModule.forFeature([Organization, Copropiedad])],
  exports: [TypeOrmModule],
})
export class OrganizationsModule {}
