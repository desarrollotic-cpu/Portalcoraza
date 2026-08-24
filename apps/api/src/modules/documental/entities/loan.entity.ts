import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 150 })
  requester!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  department!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  document!: string | null;

  @Column({ name: 'document_code', type: 'varchar', length: 60, nullable: true })
  documentCode!: string | null;

  @Column({ name: 'loan_date', type: 'date', nullable: true })
  loanDate!: string | null;

  @Column({ name: 'return_date', type: 'date', nullable: true })
  returnDate!: string | null;

  @Column({ name: 'real_return_date', type: 'date', nullable: true })
  realReturnDate!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVO' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
