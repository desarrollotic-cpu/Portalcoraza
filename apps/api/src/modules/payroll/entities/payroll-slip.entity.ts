import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';
import { PayrollPeriod } from './payroll-period.entity';
import { PayrollSlipDetail } from './payroll-slip-detail.entity';

@Entity('payroll_slips')
export class PayrollSlip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId!: string;

  @ManyToOne(() => PayrollPeriod, (p) => p.slips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'period_id' })
  period!: PayrollPeriod;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate)
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ name: 'basic_salary', type: 'numeric', precision: 12, scale: 2, default: 0 })
  basicSalary!: number;

  @Column({ name: 'worked_days', type: 'int', default: 30 })
  workedDays!: number;

  @Column({ name: 'transport_allowance', type: 'numeric', precision: 12, scale: 2, default: 0 })
  transportAllowance!: number;

  @Column({ name: 'night_surcharges', type: 'numeric', precision: 12, scale: 2, default: 0 })
  nightSurcharges!: number;

  @Column({ name: 'overtime_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  overtimeAmount!: number;

  @Column({ name: 'health_deduction', type: 'numeric', precision: 12, scale: 2, default: 0 })
  healthDeduction!: number;

  @Column({ name: 'pension_deduction', type: 'numeric', precision: 12, scale: 2, default: 0 })
  pensionDeduction!: number;

  @Column({ name: 'total_devengado', type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalDevengado!: number;

  @Column({ name: 'total_deducido', type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalDeducido!: number;

  @Column({ name: 'net_pay', type: 'numeric', precision: 12, scale: 2, default: 0 })
  netPay!: number;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl!: string | null;

  @OneToMany(() => PayrollSlipDetail, (d) => d.slip, { cascade: true })
  details!: PayrollSlipDetail[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
