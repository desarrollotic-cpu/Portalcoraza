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

export enum ResidentialIncidentStatus {
  ABIERTA = 'ABIERTA',
  EN_PROCESO = 'EN_PROCESO',
  RESUELTA = 'RESUELTA',
  CERRADA = 'CERRADA',
}

export enum ResidentialIncidentPriority {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

@Entity('residential_incidents')
export class ResidentialIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId!: string;

  @ManyToOne(() => ResidentialUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit!: ResidentialUnit;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ResidentialIncidentStatus,
    enumName: 'residential_incident_status',
    default: ResidentialIncidentStatus.ABIERTA,
  })
  status!: ResidentialIncidentStatus;

  @Column({
    type: 'enum',
    enum: ResidentialIncidentPriority,
    enumName: 'residential_incident_priority',
    default: ResidentialIncidentPriority.MEDIA,
  })
  priority!: ResidentialIncidentPriority;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'opened_at', type: 'timestamptz', default: () => 'NOW()' })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
