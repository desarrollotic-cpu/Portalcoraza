import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResidentialUnit } from './residential-unit.entity';

@Entity('visitor_parking_slots')
export class VisitorParkingSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid', unique: true })
  unitId!: string;

  @OneToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ name: 'total_slots', type: 'int', default: 0 })
  totalSlots!: number;

  @Column({ name: 'occupied_slots', type: 'int', default: 0 })
  occupiedSlots!: number;

  @Column({ name: 'available_slots', type: 'int', default: 0 })
  availableSlots!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
