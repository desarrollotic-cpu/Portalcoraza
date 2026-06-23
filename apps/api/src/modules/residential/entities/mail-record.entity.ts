import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResidentialUnit } from './residential-unit.entity';

@Entity('mail_records')
export class MailRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ type: 'varchar', length: 160, nullable: true })
  sender!: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  subject!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'RECEIVED' })
  status!: string;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'NOW()' })
  receivedAt!: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;
}
