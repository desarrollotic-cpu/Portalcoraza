import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PayrollSlip } from './payroll-slip.entity';

@Entity('payroll_periods')
export class PayrollPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'period_name', length: 100 })
  periodName!: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'varchar', length: 20, default: 'BORRADOR' })
  status!: 'BORRADOR' | 'LIQUIDADO' | 'APROBADO' | 'CERRADO';

  @OneToMany(() => PayrollSlip, (s) => s.period, { cascade: true })
  slips!: PayrollSlip[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
