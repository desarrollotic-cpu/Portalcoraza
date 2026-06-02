import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AssociateStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  VACACIONES = 'VACACIONES',
  RETIRADO = 'RETIRADO',
}

@Entity('associates')
export class Associate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_number', nullable: true, length: 30 })
  documentNumber!: string | null;

  @Column({ name: 'first_name', nullable: true, length: 100 })
  firstName!: string | null;

  @Column({ name: 'last_name', nullable: true, length: 100 })
  lastName!: string | null;

  @Column({ nullable: true, length: 30 })
  phone!: string | null;

  @Column({ nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ nullable: true, length: 100 })
  eps!: string | null;

  @Column({ nullable: true, length: 100 })
  arl!: string | null;

  @Column({ nullable: true, length: 100 })
  afp!: string | null;

  @Column({ nullable: true, length: 100 })
  bank!: string | null;

  @Column({ name: 'blood_type', nullable: true, length: 10 })
  bloodType!: string | null;

  @Column({ name: 'hire_date', type: 'date', nullable: true })
  hireDate!: string | null;

  @Column({
    type: 'enum',
    enum: AssociateStatus,
    default: AssociateStatus.ACTIVO,
  })
  status!: AssociateStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
