import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResidentialIncident } from './residential-incident.entity';

@Entity('residential_incident_history')
export class ResidentialIncidentHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'incident_id', type: 'uuid' })
  incidentId!: string;

  @ManyToOne(() => ResidentialIncident, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident!: ResidentialIncident;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy!: string | null;

  @Column({ name: 'field_name', type: 'varchar', length: 80 })
  fieldName!: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue!: string | null;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
