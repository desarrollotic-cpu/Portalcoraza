import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SstChecklistItem } from './entities/sst-checklist-item.entity';
import { SstClient } from './entities/sst-client.entity';
import { SstEvidence } from './entities/sst-evidence.entity';
import { SstInspection } from './entities/sst-inspection.entity';
import { SstResponse } from './entities/sst-response.entity';
import { SstWorkplace } from './entities/sst-workplace.entity';
import { SstController } from './sst.controller';
import { SstService } from './sst.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SstClient,
      SstWorkplace,
      SstChecklistItem,
      SstInspection,
      SstResponse,
      SstEvidence,
    ]),
  ],
  controllers: [SstController],
  providers: [SstService],
  exports: [SstService],
})
export class SstModule {}
