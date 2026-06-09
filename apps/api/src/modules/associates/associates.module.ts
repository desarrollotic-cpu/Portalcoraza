import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AssociatesController } from './associates.controller';
import { AssociatesService } from './associates.service';
import { AssociateHistory } from './entities/associate-history.entity';
import { Associate } from './entities/associate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Associate, AssociateHistory]), AuditModule],
  controllers: [AssociatesController],
  providers: [AssociatesService],
  exports: [AssociatesService],
})
export class AssociatesModule {}
