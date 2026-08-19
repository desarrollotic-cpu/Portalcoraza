import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditModule } from '../audit/audit.module';
import { ReceptionVisitor } from './entities/reception-visitor.entity';
import { ReceptionController } from './reception.controller';
import { ReceptionService } from './reception.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceptionVisitor, Associate]),
    AuditModule,
  ],
  controllers: [ReceptionController],
  providers: [ReceptionService],
  exports: [ReceptionService],
})
export class ReceptionModule {}
