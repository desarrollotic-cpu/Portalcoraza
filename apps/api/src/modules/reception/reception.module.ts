import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { ReceptionVisitor } from './entities/reception-visitor.entity';
import { ReceptionController } from './reception.controller';
import { ReceptionService } from './reception.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReceptionVisitor]), AuditModule],
  controllers: [ReceptionController],
  providers: [ReceptionService],
  exports: [ReceptionService],
})
export class ReceptionModule {}
