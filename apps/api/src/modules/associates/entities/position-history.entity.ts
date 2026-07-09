import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobPosition } from '../../hr-positions/entities/job-position.entity';
import { WorkCenter } from '../../hr-work-centers/entities/work-center.entity';
import { Associate } from './associate.entity';

@Entity('position_history')
@Index('idx_position_history_associate', ['associateId', 'changedAt'])
export class PositionHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ name: 'job_position_id', type: 'uuid' })
  jobPositionId!: string;

  @ManyToOne(() => JobPosition)
  @JoinColumn({ name: 'job_position_id' })
  jobPosition!: JobPosition;

  @Column({ name: 'work_center_id', type: 'uuid', nullable: true })
  workCenterId!: string | null;

  @ManyToOne(() => WorkCenter)
  @JoinColumn({ name: 'work_center_id' })
  workCenter!: WorkCenter | null;

  @Column({ name: 'change_reason', type: 'varchar', length: 200, nullable: true })
  changeReason!: string | null;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;
}
