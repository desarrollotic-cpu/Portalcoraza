import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayrollSlip } from './payroll-slip.entity';

@Entity('payroll_slip_details')
export class PayrollSlipDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'slip_id', type: 'uuid' })
  slipId!: string;

  @ManyToOne(() => PayrollSlip, (s) => s.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slip_id' })
  slip!: PayrollSlip;

  @Column({ name: 'concept_code', length: 50 })
  conceptCode!: string;

  @Column({ name: 'concept_name', length: 150 })
  conceptName!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: 'DEVENGADO' | 'DEDUCCION';

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0 })
  hours!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
