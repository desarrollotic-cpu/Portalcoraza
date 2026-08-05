import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_minutes')
export class Minute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'minute_type', type: 'varchar', length: 60 })
  minuteType!: string;

  @Column({ name: 'post_name', type: 'varchar', length: 150, nullable: true })
  postName!: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'close_date', type: 'date', nullable: true })
  closeDate!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVO' })
  status!: string;

  @Column({ name: 'unique_code', type: 'varchar', length: 60, nullable: true })
  uniqueCode!: string | null;

  @Column({ name: 'numeric_code', type: 'int', nullable: true })
  numericCode!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voxelsera!: string | null;

  @Column({ name: 'responsible', type: 'uuid', nullable: true })
  responsible!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
