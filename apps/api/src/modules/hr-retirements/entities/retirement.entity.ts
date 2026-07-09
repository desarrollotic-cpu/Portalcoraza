import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';
import { CatalogValue } from '../../hr-catalogs/entities/catalog-value.entity';

export enum RetirementLiquidationStatus {
  PENDIENTE = 'PENDIENTE',
  OK = 'OK',
  EN_PROCESO = 'EN_PROCESO',
  RECHAZADA = 'RECHAZADA',
}

export enum RetirementWouldReturn {
  SI = 'SI',
  NO = 'NO',
  NA = 'N-A',
}

@Entity('associate_retirements')
export class Retirement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ name: 'retirement_date', type: 'date' })
  retirementDate!: string;

  @Column({ name: 'last_position', type: 'varchar', length: 150 })
  lastPosition!: string;

  @Column({
    name: 'age_at_retirement',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: {
      to: (v: number) => v,
      from: (v: string | null) => (v === null ? 0 : parseFloat(v)),
    },
  })
  ageAtRetirement!: number;

  @Column({
    name: 'liquidation_status',
    type: 'enum',
    enum: RetirementLiquidationStatus,
    enumName: 'retirement_liquidation_status',
    default: RetirementLiquidationStatus.PENDIENTE,
  })
  liquidationStatus!: RetirementLiquidationStatus;

  @Column({ name: 'reason_id', type: 'uuid' })
  reasonId!: string;

  @ManyToOne(() => CatalogValue)
  @JoinColumn({ name: 'reason_id' })
  reason!: CatalogValue;

  @Column({ name: 'cause_id', type: 'uuid' })
  causeId!: string;

  @ManyToOne(() => CatalogValue)
  @JoinColumn({ name: 'cause_id' })
  cause!: CatalogValue;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({ name: 'least_liked', type: 'text', nullable: true })
  leastLiked!: string | null;

  @Column({
    name: 'would_return',
    type: 'enum',
    enum: RetirementWouldReturn,
    enumName: 'retirement_would_return',
    default: RetirementWouldReturn.NA,
  })
  wouldReturn!: RetirementWouldReturn;

  // ─── Encuesta de salida (1..5) ──────────────────────────────────────────
  @Column({ name: 'survey_physical_env', type: 'smallint' })
  surveyPhysicalEnv!: number;

  @Column({ name: 'survey_induction', type: 'smallint' })
  surveyInduction!: number;

  @Column({ name: 'survey_reinduction', type: 'smallint' })
  surveyReinduction!: number;

  @Column({ name: 'survey_training', type: 'smallint' })
  surveyTraining!: number;

  @Column({ name: 'survey_group_motivation', type: 'smallint' })
  surveyGroupMotivation!: number;

  @Column({ name: 'survey_recognition', type: 'smallint' })
  surveyRecognition!: number;

  @Column({ name: 'survey_compensation', type: 'smallint' })
  surveyCompensation!: number;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
