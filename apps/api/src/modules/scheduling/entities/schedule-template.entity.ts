import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PersonalRole } from './monthly-schedule.entity';

export interface TemplatePatternItem {
  diaRelativo: number;
  rol: string;
  turno: string | null;
  jornada: string;
  codigo?: string | null;
}

@Entity('schedule_templates')
export class ScheduleTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  personal!: PersonalRole[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  patron!: TemplatePatternItem[];

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
