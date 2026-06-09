import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  REST = 'REST',
}

@Entity('shift_schedules')
export class ShiftSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ name: 'shift_type', type: 'enum', enum: ShiftType, enumName: 'shift_type' })
  shiftType!: ShiftType;

  @Column({ name: 'workday_hours', type: 'int' })
  workdayHours!: number;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
