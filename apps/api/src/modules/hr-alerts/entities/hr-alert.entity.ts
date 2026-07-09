import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';

export enum HrAlertType {
  VENCIMIENTO_CURSO = 'VENCIMIENTO_CURSO',
  VENCIMIENTO_PSICOFISICO = 'VENCIMIENTO_PSICOFISICO',
  VENCIMIENTO_PSICOSENSOMETRICO = 'VENCIMIENTO_PSICOSENSOMETRICO',
  VENCIMIENTO_POLIZA = 'VENCIMIENTO_POLIZA',
  DOCUMENTO_FALTANTE = 'DOCUMENTO_FALTANTE',
}

export enum HrAlertStatus {
  PENDIENTE = 'PENDIENTE',
  RESUELTA = 'RESUELTA',
}

@Entity('hr_alerts')
@Index('idx_hr_alerts_status', ['status', 'expirationDate'])
export class HrAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({
    name: 'alert_type',
    type: 'enum',
    enum: HrAlertType,
    enumName: 'hr_alert_type',
  })
  alertType!: HrAlertType;

  @Column({ name: 'expiration_date', type: 'date' })
  expirationDate!: string;

  @Column({
    type: 'enum',
    enum: HrAlertStatus,
    enumName: 'hr_alert_status',
    default: HrAlertStatus.PENDIENTE,
  })
  status!: HrAlertStatus;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;
}
