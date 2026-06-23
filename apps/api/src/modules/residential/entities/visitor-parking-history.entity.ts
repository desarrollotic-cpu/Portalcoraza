import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Visitor } from './visitor.entity';
import { VisitorParkingSlot } from './visitor-parking-slot.entity';

@Entity('visitor_parking_history')
export class VisitorParkingHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parking_slot_id', type: 'uuid' })
  parkingSlotId!: string;

  @ManyToOne(() => VisitorParkingSlot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_slot_id' })
  parkingSlot!: VisitorParkingSlot;

  @Column({ name: 'visitor_id', type: 'uuid', nullable: true })
  visitorId!: string | null;

  @ManyToOne(() => Visitor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'visitor_id' })
  visitor!: Visitor | null;

  @Column({ type: 'varchar', length: 20 })
  action!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
