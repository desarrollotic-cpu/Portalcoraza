import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { DocumentalController } from './documental.controller';
import { DocumentalService } from './documental.service';
import { DocumentRecord } from './entities/document-record.entity';
import { DocumentType } from './entities/document-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentType, DocumentRecord]), AuditModule],
  controllers: [DocumentalController],
  providers: [DocumentalService],
  exports: [DocumentalService],
})
export class DocumentalModule {}
