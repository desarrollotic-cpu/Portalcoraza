import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'contract_type', type: 'varchar', length: 120, nullable: true })
  contractType!: string | null;

  @Column({ name: 'contract_number', type: 'varchar', length: 120, unique: true, nullable: true })
  contractNumber!: string | null;

  @Column({ name: 'numeric_code', type: 'int', nullable: true })
  numericCode!: number | null;

  @Column({ name: 'party_a', type: 'varchar', length: 150, nullable: true })
  partyA!: string | null;

  @Column({ name: 'party_b', type: 'varchar', length: 150, nullable: true })
  partyB!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nit!: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ name: 'contract_value', type: 'numeric', precision: 15, scale: 2, nullable: true })
  contractValue!: string | null;

  @Column({ name: 'contract_object', type: 'text', nullable: true })
  contractObject!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'VIGENTE' })
  status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voxelsera!: string | null;

  @Column({ name: 'source_sheet', type: 'varchar', length: 120, nullable: true })
  sourceSheet!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
