import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MonthlyScheduleRole } from './monthly-schedule-role.entity';
import { ScheduleAssignment } from './schedule-assignment.entity';

export enum ScheduleStatus {
  BORRADOR = 'borrador',
  PUBLICADO = 'publicado',
  ANULADO = 'anulado',
}

export interface PersonalRole {
  rol: string;
  associateId: string | null;
  turnoId: string | null;
  displayName?: string;
  /** Nombre al leer/guardar el cuadro; no sustituye associates. */
  associateName?: string | null;
}

@Entity('monthly_schedules')
export class MonthlySchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int' })
  month!: number;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    enumName: 'schedule_status',
    default: ScheduleStatus.BORRADOR,
  })
  status!: ScheduleStatus;

  /**
   * Roles del cuadro, en la forma que usan el API y el cuadro.
   *
   * **No es una columna.** Desde la migración 093 los roles viven en
   * `monthly_schedule_roles`; esto se arma desde `roles` al leer y se traduce a
   * filas al guardar. La columna `personal` sigue en la base pero sin uso, y se
   * elimina en una migración posterior.
   */
  personal!: PersonalRole[];

  /** Nota del puesto en este mes (planilla Excel: Observaciones). */
  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ScheduleAssignment, (assignment) => assignment.schedule)
  assignments!: ScheduleAssignment[];

  @OneToMany(() => MonthlyScheduleRole, (role) => role.schedule)
  roles!: MonthlyScheduleRole[];

  /** Solo respuesta API: vigilantes del cuadro para mostrar nombres sin lookup masivo. */
  resolvedAssociates?: Array<{
    id: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
}
