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
import { SstChecklistItem } from './sst-checklist-item.entity';
import { SstEvidence } from './sst-evidence.entity';
import { SstInspection } from './sst-inspection.entity';

export enum SstValoracion {
  SEGURO = 'SEGURO',
  RIESGOSO = 'RIESGOSO',
  N_A = 'N_A',
}

export enum SstPlanStatus {
  ABIERTO = 'ABIERTO',
  EN_PROCESO = 'EN_PROCESO',
  CERRADO = 'CERRADO',
  REINCIDENTE = 'REINCIDENTE',
}

@Entity('sst_responses')
export class SstResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'inspection_id', type: 'uuid' })
  inspectionId!: string;

  @ManyToOne(() => SstInspection, (i) => i.respuestas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inspection_id' })
  inspection!: SstInspection;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => SstChecklistItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item!: SstChecklistItem;

  @Column({ type: 'enum', enum: SstValoracion, nullable: true })
  valoracion!: SstValoracion | null;

  @Column({ name: 'valoracion_anterior', type: 'enum', enum: SstValoracion, nullable: true })
  valoracionAnterior!: SstValoracion | null;

  @Column({ type: 'text', nullable: true })
  hallazgo!: string | null;

  @Column({ name: 'plan_accion_propuesto', type: 'text', nullable: true })
  planAccionPropuesto!: string | null;

  @Column({ name: 'responsable_plan_accion', type: 'text', nullable: true })
  responsablePlanAccion!: string | null;

  @Column({ name: 'fecha_compromiso', type: 'date', nullable: true })
  fechaCompromiso!: string | null;

  @Column({
    name: 'estado_plan_accion',
    type: 'enum',
    enum: SstPlanStatus,
    nullable: true,
  })
  estadoPlanAccion!: SstPlanStatus | null;

  @Column({ name: 'reincidencia_count', type: 'int', default: 0 })
  reincidenciaCount!: number;

  @Column({ name: 'fecha_cierre', type: 'date', nullable: true })
  fechaCierre!: string | null;

  @OneToMany(() => SstEvidence, (e) => e.response)
  evidencias!: SstEvidence[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
