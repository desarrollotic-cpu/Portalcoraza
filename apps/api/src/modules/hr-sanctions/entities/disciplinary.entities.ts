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

export type SanctionType = 'SUSPENSION' | 'LLAMADO_ATENCION' | 'PECUNIARIA';

/** Códigos especiales de `diasPorVez` (N > 0 = días de suspensión). */
export const LLAMADA_ATENCION = 0;
export const NO_APLICA = -1;
export const PECUNIARIA = -2;
export type SanctionStatus = 'PROGRAMADA' | 'VIGENTE' | 'CUMPLIDA' | 'ANULADA';

@Entity('disciplinary_numerals')
export class DisciplinaryNumeral {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'text' })
  numeral!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  /** Sanción de la 1.ª, 2.ª, 3.ª y 4.ª vez: días (>0), 0 llamada de atención, -1 no aplica, -2 pecuniaria. */
  @Column({ name: 'dias_por_vez', type: 'int', array: true })
  diasPorVez!: number[];

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('disciplinary_sanctions')
export class DisciplinarySanction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({ name: 'numeral_id', type: 'uuid', nullable: true })
  numeralId!: string | null;

  @Column({ type: 'text' })
  numeral!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  /** 1.ª a 4.ª vez que se sanciona por este numeral. */
  @Column({ type: 'int', default: 1 })
  ocurrencia!: number;

  @Column({ type: 'text' })
  tipo!: SanctionType;

  @Column({ type: 'int', default: 0 })
  dias!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  motivo!: string | null;

  @Column({ type: 'text', default: 'PROGRAMADA' })
  status!: SanctionStatus;

  @Column({ name: 'previous_status', type: 'text', nullable: true })
  previousStatus!: string | null;

  @Column({ name: 'annul_reason', type: 'text', nullable: true })
  annulReason!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'annulled_by', type: 'uuid', nullable: true })
  annulledBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
