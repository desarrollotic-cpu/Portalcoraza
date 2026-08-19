import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingEntryDetail } from './entities/accounting-entry-detail.entity';
import { AccountingEntry } from './entities/accounting-entry.entity';
import { PucAccount } from './entities/puc-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PucAccount, AccountingEntry, AccountingEntryDetail]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
