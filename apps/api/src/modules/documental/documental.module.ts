import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContractsController } from './controllers/contracts.controller';
import { CorrespondenceController } from './controllers/correspondence.controller';
import { LibraryController } from './controllers/library.controller';
import { LoansController } from './controllers/loans.controller';
import { MinutesController } from './controllers/minutes.controller';
import { OverviewController } from './controllers/overview.controller';
import { PublicLoansController } from './controllers/public-loans.controller';
import { RetiredPersonnelController } from './controllers/retired-personnel.controller';
import { WorkflowsController } from './controllers/workflows.controller';
import { DocumentalController } from './documental.controller';
import { DocumentalService } from './documental.service';
import { Contract } from './entities/contract.entity';
import { Correspondence } from './entities/correspondence.entity';
import { DocCounter } from './entities/doc-counter.entity';
import { DocumentRecord } from './entities/document-record.entity';
import { DocumentType } from './entities/document-type.entity';
import { LibraryFile } from './entities/library-file.entity';
import { LibraryFolder } from './entities/library-folder.entity';
import { Loan } from './entities/loan.entity';
import { LoanMailLog } from './entities/loan-mail-log.entity';
import { Minute } from './entities/minute.entity';
import { RetentionItem } from './entities/retention-item.entity';
import { RetiredPersonnel } from './entities/retired-personnel.entity';
import { Workflow } from './entities/workflow.entity';
import { ContractsService } from './services/contracts.service';
import { CorrespondenceService } from './services/correspondence.service';
import { DocumentalMailService } from './services/documental-mail.service';
import { LibraryService } from './services/library.service';
import { LoansService } from './services/loans.service';
import { MinutesService } from './services/minutes.service';
import { OverviewService } from './services/overview.service';
import { RetiredPersonnelService } from './services/retired-personnel.service';
import { SequenceService } from './services/sequence.service';
import { WorkflowsService } from './services/workflows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DocumentType,
      DocumentRecord,
      DocCounter,
      RetentionItem,
      Correspondence,
      Minute,
      RetiredPersonnel,
      Contract,
      Workflow,
      Loan,
      LoanMailLog,
      LibraryFolder,
      LibraryFile,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [
    DocumentalController,
    CorrespondenceController,
    MinutesController,
    RetiredPersonnelController,
    ContractsController,
    LoansController,
    PublicLoansController,
    LibraryController,
    WorkflowsController,
    OverviewController,
  ],
  providers: [
    DocumentalService,
    SequenceService,
    CorrespondenceService,
    MinutesService,
    RetiredPersonnelService,
    ContractsService,
    LoansService,
    LibraryService,
    WorkflowsService,
    OverviewService,
    DocumentalMailService,
  ],
  exports: [DocumentalService, OverviewService, DocumentalMailService],
})
export class DocumentalModule {}
