import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResidentialUnit } from './residential-unit.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ type: 'varchar', length: 20 })
  plate!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  color!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
