import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_retired_personnel')
export class RetiredPersonnel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ name: 'id_number', type: 'varchar', length: 50, unique: true })
  idNumber!: string;

  @Column({ name: 'retirement_date', type: 'date', nullable: true })
  retirementDate!: string | null;

  @Column({ name: 'retirement_reason', type: 'text', nullable: true })
  retirementReason!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({ name: 'person_type', type: 'varchar', length: 40, default: 'EMPLEADO' })
  personType!: string;

  @Column({ name: 'numeric_code', type: 'int', nullable: true })
  numericCode!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voxelsera!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
