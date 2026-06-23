import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Resident } from './resident.entity';
import { ResidentialUnit } from './residential-unit.entity';

export enum PackageStatus {
  RECEIVED = 'RECEIVED',
  DELIVERED = 'DELIVERED',
}

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ name: 'resident_id', type: 'uuid', nullable: true })
  residentId!: string | null;

  @ManyToOne(() => Resident, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resident_id' })
  resident!: Resident | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  sender!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: PackageStatus,
    enumName: 'package_status',
    default: PackageStatus.RECEIVED,
  })
  status!: PackageStatus;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'NOW()' })
  receivedAt!: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;
}
