import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';
import { DiagnosisCie10 } from './diagnosis-cie10.entity';

export enum AbsenteeismKind {
  MEDICO = 'MEDICO',
  OTRO = 'OTRO',
}

export enum AbsenteeismEventType {
  DA = 'D.A.',
  SP = 'S.P.',
  LR = 'L.R.',
  LNR = 'L.N.R.',
  ACT = 'ACT',
}

@Entity('associate_absences')
export class AssociateAbsence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ type: 'enum', enum: AbsenteeismKind, enumName: 'absenteeism_kind' })
  kind!: AbsenteeismKind;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: AbsenteeismEventType,
    enumName: 'absenteeism_event_type',
  })
  eventType!: AbsenteeismEventType;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'absence_days', type: 'int' })
  absenceDays!: number;

  @Column({ name: 'days_in_month', type: 'int', nullable: true })
  daysInMonth!: number | null;

  @Column({ name: 'is_extension', type: 'boolean', default: false })
  isExtension!: boolean;

  @Column({ name: 'post_incapacity_exam', type: 'boolean', default: false })
  postIncapacityExam!: boolean;

  @Column({ name: 'incapacity_origin', type: 'varchar', length: 80, nullable: true })
  incapacityOrigin!: string | null;

  @Column({ name: 'diagnosis_id', type: 'uuid', nullable: true })
  diagnosisId!: string | null;

  @ManyToOne(() => DiagnosisCie10, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'diagnosis_id' })
  diagnosis!: DiagnosisCie10 | null;

  @Column({ type: 'text', nullable: true })
  cause!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({
    name: 'base_salary',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v === null ? null : parseFloat(v)),
    },
  })
  baseSalary!: number | null;

  @Column({
    name: 'at_costs',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null) => v,
      from: (v: string | null) => (v === null ? null : parseFloat(v)),
    },
  })
  atCosts!: number | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
