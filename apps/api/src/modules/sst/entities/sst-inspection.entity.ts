import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SstResponse } from './sst-response.entity';
import { SstWorkplace } from './sst-workplace.entity';

export enum SstInspectionType {
  IPT_INICIAL = 'IPT_INICIAL',
  SEGUIMIENTO = 'SEGUIMIENTO',
}

export enum SstInspectionStatus {
  BORRADOR = 'BORRADOR',
  COMPLETADA = 'COMPLETADA',
  CERRADA = 'CERRADA',
}

@Entity('sst_inspections')
export class SstInspection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'workplace_id', type: 'uuid' })
  workplaceId!: string;

  @ManyToOne(() => SstWorkplace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workplace_id' })
  workplace!: SstWorkplace;

  @Column({ type: 'enum', enum: SstInspectionType, default: SstInspectionType.IPT_INICIAL })
  tipo!: SstInspectionType;

  @Column({ name: 'inspeccion_anterior_id', type: 'uuid', nullable: true })
  inspeccionAnteriorId!: string | null;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ name: 'responsable_nombre', type: 'text' })
  responsableNombre!: string;

  @Column({ name: 'responsable_cargo', type: 'text', default: 'Inspector SST' })
  responsableCargo!: string;

  @Column({ name: 'inspector_user_id', type: 'uuid', nullable: true })
  inspectorUserId!: string | null;

  @Column({ type: 'enum', enum: SstInspectionStatus, default: SstInspectionStatus.BORRADOR })
  estado!: SstInspectionStatus;

  @Column({ name: 'observaciones_generales', type: 'text', nullable: true })
  observacionesGenerales!: string | null;

  @Column({
    name: 'cumplimiento_global',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  cumplimientoGlobal!: string | null;

  @Column({ name: 'nivel_riesgo', type: 'text', nullable: true })
  nivelRiesgo!: string | null;

  @OneToMany(() => SstResponse, (r) => r.inspection)
  respuestas!: SstResponse[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
