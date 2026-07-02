import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MonthlySchedule } from './monthly-schedule.entity';

export enum Jornada {
  NORMAL = 'normal',
  DESCANSO_REMUNERADO = 'descanso_remunerado',
  DESCANSO_NO_REMUNERADO = 'descanso_no_remunerado',
  VACACION = 'vacacion',
  LICENCIA = 'licencia',
  SUSPENSION = 'suspension',
  INCAPACIDAD = 'incapacidad',
  ACCIDENTE = 'accidente',
  SIN_ASIGNAR = 'sin_asignar',
}

export type Turno = 'AM' | 'PM' | '24H';

@Entity('schedule_assignments')
export class ScheduleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId!: string;

  @Column({ type: 'int' })
  day!: number;

  @Column({ type: 'text' })
  role!: string;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text', nullable: true })
  turno!: Turno | null;

  @Column({ type: 'text', default: Jornada.SIN_ASIGNAR })
  jornada!: Jornada;

  @Column({ type: 'text', nullable: true })
  codigo!: string | null;

  @Column({ type: 'text', nullable: true })
  inicio!: string | null;

  @Column({ type: 'text', nullable: true })
  fin!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => MonthlySchedule, (schedule) => schedule.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: MonthlySchedule;
}
