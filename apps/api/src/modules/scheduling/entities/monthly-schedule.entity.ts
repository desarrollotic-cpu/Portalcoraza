import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ScheduleAssignment } from './schedule-assignment.entity';

export enum ScheduleStatus {
  BORRADOR = 'borrador',
  PUBLICADO = 'publicado',
  ANULADO = 'anulado',
}

export interface PersonalRole {
  rol: string;
  associateId: string | null;
  turnoId: string | null;
  displayName?: string;
}

@Entity('monthly_schedules')
export class MonthlySchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int' })
  month!: number;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    enumName: 'schedule_status',
    default: ScheduleStatus.BORRADOR,
  })
  status!: ScheduleStatus;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  personal!: PersonalRole[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ScheduleAssignment, (assignment) => assignment.schedule)
  assignments!: ScheduleAssignment[];
}
