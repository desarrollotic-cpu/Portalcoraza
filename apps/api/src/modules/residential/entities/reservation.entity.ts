import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReservationApprovalMode } from './residential-unit.entity';
import { ResidentialUnit } from './residential-unit.entity';

export enum ReservationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ name: 'resource_code', type: 'varchar', length: 60 })
  resourceCode!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({
    name: 'approval_mode',
    type: 'enum',
    enum: ReservationApprovalMode,
    enumName: 'reservation_approval_mode',
    default: ReservationApprovalMode.MANUAL,
  })
  approvalMode!: ReservationApprovalMode;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    enumName: 'reservation_status',
    default: ReservationStatus.PENDING,
  })
  status!: ReservationStatus;

  @Column({ name: 'requested_by', type: 'uuid', nullable: true })
  requestedBy!: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
