import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountingEntry } from './accounting-entry.entity';
import { PucAccount } from './puc-account.entity';

@Entity('accounting_entry_details')
export class AccountingEntryDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entry_id', type: 'uuid' })
  entryId!: string;

  @ManyToOne(() => AccountingEntry, (e) => e.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry!: AccountingEntry;

  @Column({ name: 'account_code', length: 10 })
  accountCode!: string;

  @ManyToOne(() => PucAccount)
  @JoinColumn({ name: 'account_code' })
  account!: PucAccount;

  @Column({ name: 'debit_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  debitAmount!: number;

  @Column({ name: 'credit_amount', type: 'numeric', precision: 14, scale: 2, default: 0 })
  creditAmount!: number;

  @Column({ name: 'cost_center', nullable: true, length: 100 })
  costCenter!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
