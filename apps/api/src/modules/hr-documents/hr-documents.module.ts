import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { Associate } from '../associates/entities/associate.entity';
import { AuditModule } from '../audit/audit.module';
import { AssociateDocument } from './entities/associate-document.entity';
import { HrDocumentsController } from './hr-documents.controller';
import { HrDocumentsService } from './hr-documents.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AssociateDocument, Associate]),
    AuditModule,
  ],
  controllers: [HrDocumentsController],
  providers: [HrDocumentsService, SupabaseStorageService],
  exports: [HrDocumentsService],
})
export class HrDocumentsModule {}
