import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MonthlySchedule } from './monthly-schedule.entity';

/**
 * Un rol del cuadro de un puesto en un mes: titular A/B, relevante, ronda.
 *
 * Reemplaza el JSONB `monthly_schedules.personal` (migración 093). El cambio
 * trae integridad referencial — al dar de baja un vigilante su id se limpia
 * solo — y permite consultar por asociado, que sobre el JSON no se podía.
 */
@Entity('monthly_schedule_roles')
export class MonthlyScheduleRole {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'schedule_id', type: 'uuid' })
  scheduleId!: string;

  /** Clave del rol; de ella sale el tipo (ver `MotorTurnosService`). */
  @Column({ type: 'text' })
  rol!: string;

  /** Titular del rol en el mes. Las celdas día a día pueden tener a otro. */
  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ name: 'turno_id', type: 'text', nullable: true })
  turnoId!: string | null;

  /** Rótulo libre («Garita 2»). No decide el tipo de rol. */
  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName!: string | null;

  @Column({ type: 'int', default: 0 })
  orden!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => MonthlySchedule, (schedule) => schedule.roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'schedule_id' })
  schedule!: MonthlySchedule;
}
