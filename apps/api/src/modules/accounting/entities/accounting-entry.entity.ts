import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountingEntryDetail } from './accounting-entry-detail.entity';

@Entity('accounting_entries')
export class AccountingEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entry_number', unique: true, length: 30 })
  entryNumber!: string;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: string;

  @Column({ type: 'text' })
  concept!: string;

  @Column({ name: 'source_module', length: 50 })
  sourceModule!: 'NOMINA' | 'DOTACION' | 'FACTURACION' | 'RECAUDO' | 'MANUAL';

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ length: 20, default: 'ASENTADO' })
  status!: 'BORRADOR' | 'ASENTADO' | 'ANULADO';

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @OneToMany(() => AccountingEntryDetail, (d) => d.entry, { cascade: true })
  details!: AccountingEntryDetail[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
