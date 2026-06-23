import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Resident } from './resident.entity';
import { ResidentialUnit } from './residential-unit.entity';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ name: 'host_resident_id', type: 'uuid', nullable: true })
  hostResidentId!: string | null;

  @ManyToOne(() => Resident, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'host_resident_id' })
  hostResident!: Resident | null;

  @Column({ name: 'full_name', type: 'varchar', length: 160 })
  fullName!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 40, nullable: true })
  documentNumber!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  plate!: string | null;

  @Column({ name: 'entry_time', type: 'timestamptz', default: () => 'NOW()' })
  entryTime!: Date;

  @Column({ name: 'exit_time', type: 'timestamptz', nullable: true })
  exitTime!: Date | null;
}
