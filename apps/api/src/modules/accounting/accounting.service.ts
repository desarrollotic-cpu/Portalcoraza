import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountingEntryDetail } from './entities/accounting-entry-detail.entity';
import { AccountingEntry } from './entities/accounting-entry.entity';
import { PucAccount } from './entities/puc-account.entity';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(PucAccount)
    private readonly pucRepo: Repository<PucAccount>,
    @InjectRepository(AccountingEntry)
    private readonly entryRepo: Repository<AccountingEntry>,
    @InjectRepository(AccountingEntryDetail)
    private readonly detailRepo: Repository<AccountingEntryDetail>,
  ) {}

  async getPucTree(): Promise<PucAccount[]> {
    return this.pucRepo.find({
      order: { code: 'ASC' },
    });
  }

  async getEntries(): Promise<AccountingEntry[]> {
    return this.entryRepo.find({
      relations: ['details', 'details.account'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getEntryById(id: string): Promise<AccountingEntry> {
    const entry = await this.entryRepo.findOne({
      where: { id },
      relations: ['details', 'details.account'],
    });
    if (!entry) throw new NotFoundException('Comprobante contable no encontrado');
    return entry;
  }

  async createEntry(dto: {
    concept: string;
    sourceModule: 'NOMINA' | 'DOTACION' | 'FACTURACION' | 'RECAUDO' | 'MANUAL';
    sourceId?: string;
    createdBy?: string;
    details: { accountCode: string; debitAmount: number; creditAmount: number; costCenter?: string }[];
  }): Promise<AccountingEntry> {
    if (!dto.details || dto.details.length === 0) {
      throw new BadRequestException('El comprobante contable debe contener al menos un asiento');
    }

    const totalDebit = dto.details.reduce((sum, d) => sum + (Number(d.debitAmount) || 0), 0);
    const totalCredit = dto.details.reduce((sum, d) => sum + (Number(d.creditAmount) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Desbalance en comprobante contable: Débitos ($${totalDebit.toFixed(2)}) !== Créditos ($${totalCredit.toFixed(2)})`,
      );
    }

    const count = await this.entryRepo.count();
    const entryNumber = `CC-${String(count + 1).padStart(6, '0')}`;

    const entry = this.entryRepo.create({
      entryNumber,
      entryDate: new Date().toISOString().split('T')[0],
      concept: dto.concept,
      sourceModule: dto.sourceModule,
      sourceId: dto.sourceId ?? null,
      createdBy: dto.createdBy ?? null,
      status: 'ASENTADO',
    });

    const savedEntry = await this.entryRepo.save(entry);

    const detailsToSave = dto.details.map((d) =>
      this.detailRepo.create({
        entryId: savedEntry.id,
        accountCode: d.accountCode,
        debitAmount: d.debitAmount,
        creditAmount: d.creditAmount,
        costCenter: d.costCenter ?? null,
      }),
    );

    await this.detailRepo.save(detailsToSave);
    return this.getEntryById(savedEntry.id);
  }
}
