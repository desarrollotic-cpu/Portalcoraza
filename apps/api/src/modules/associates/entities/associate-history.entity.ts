import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Associate } from './associate.entity';

@Entity('associate_history')
export class AssociateHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @Column({ name: 'field_name', type: 'varchar', length: 80 })
  fieldName!: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue!: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
