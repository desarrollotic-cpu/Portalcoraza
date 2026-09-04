import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('doc_loan_mail_log')
export class LoanMailLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'loan_id', type: 'uuid' })
  loanId!: string;

  @Column({ type: 'varchar', length: 40 })
  kind!: string;

  @Column({ name: 'to_email', type: 'varchar', length: 150 })
  toEmail!: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  subject!: string | null;

  @Column({ type: 'boolean', default: false })
  success!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  provider!: string | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
