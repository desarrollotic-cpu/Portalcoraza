import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MonthlySchedule,
  PersonalRole,
  ScheduleStatus,
} from './entities/monthly-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import {
  CreateMonthlyScheduleDto,
  GenerateMotorDto,
  GetMonthlyScheduleDto,
  ListMonthlyScheduleDto,
  SaveMonthlyScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/monthly-scheduling.dto';
import { MotorTurnosService } from './motor-turnos.service';

const DEFAULT_ROLES: PersonalRole[] = [
  { rol: 'titular_a', associateId: null, turnoId: 'AM', displayName: 'Titular A' },
  { rol: 'titular_b', associateId: null, turnoId: 'PM', displayName: 'Titular B' },
  { rol: 'relevante', associateId: null, turnoId: 'AM', displayName: 'Relevante' },
];

@Injectable()
export class MonthlySchedulingService {
  constructor(
    @InjectRepository(MonthlySchedule)
    private readonly schedulesRepo: Repository<MonthlySchedule>,
    @InjectRepository(ScheduleAssignment)
    private readonly assignmentsRepo: Repository<ScheduleAssignment>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly motor: MotorTurnosService,
  ) {}

  async getOne(query: GetMonthlyScheduleDto): Promise<MonthlySchedule | null> {
    return this.schedulesRepo.findOne({
      where: { postId: query.postId, year: query.year, month: query.month },
      relations: { assignments: true },
    });
  }

  async listByMonth(query: ListMonthlyScheduleDto): Promise<MonthlySchedule[]> {
    return this.schedulesRepo.find({
      where: { year: query.year, month: query.month },
      order: { createdAt: 'ASC' },
    });
  }

  async createOrGet(dto: CreateMonthlyScheduleDto, userId: string) {
    const existing = await this.schedulesRepo.findOne({
      where: { postId: dto.postId, year: dto.year, month: dto.month },
      relations: { assignments: true },
    });
    if (existing) {
      return existing;
    }

    const inherited = await this.inheritPersonal(dto.postId, dto.year, dto.month);

    const saved = await this.schedulesRepo.save(
      this.schedulesRepo.create({
        postId: dto.postId,
        year: dto.year,
        month: dto.month,
        status: ScheduleStatus.BORRADOR,
        personal: inherited,
        createdBy: userId,
        updatedBy: userId,
      }),
    );

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'monthly_schedule.create',
      entityType: 'monthly_schedule',
      entityId: saved.id,
      newValue: { postId: dto.postId, year: dto.year, month: dto.month },
    });

    return this.getById(saved.id);
  }

  async save(id: string, dto: SaveMonthlyScheduleDto, userId: string) {
    const schedule = await this.getById(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(MonthlySchedule, id, {
        personal: dto.personal as PersonalRole[],
        updatedBy: userId,
      });

      await manager.delete(ScheduleAssignment, { scheduleId: id });

      const rows = dto.assignments.map((a) =>
        manager.create(ScheduleAssignment, {
          scheduleId: id,
          day: a.day,
          role: a.role,
          associateId: a.associateId ?? null,
          turno: a.turno ?? null,
          jornada: a.jornada,
          codigo: a.codigo ?? null,
          inicio: a.inicio ?? null,
          fin: a.fin ?? null,
        }),
      );

      if (rows.length) {
        await manager.save(rows, { chunk: 200 });
      }
    });

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'monthly_schedule.save',
      entityType: 'monthly_schedule',
      entityId: id,
      newValue: {
        postId: schedule.postId,
        roles: dto.personal.length,
        assignments: dto.assignments.length,
      },
    });

    return this.getById(id);
  }

  async updateStatus(id: string, dto: UpdateScheduleStatusDto, userId: string) {
    const schedule = await this.getById(id);
    await this.schedulesRepo.update(id, {
      status: dto.status,
      updatedBy: userId,
    });

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: `monthly_schedule.${dto.status}`,
      entityType: 'monthly_schedule',
      entityId: id,
      oldValue: { status: schedule.status },
      newValue: { status: dto.status },
    });

    if (dto.status === ScheduleStatus.PUBLICADO) {
      await this.notificationsService.sendToRole(
        'GERENCIA',
        'Programación publicada',
        `Se publicó la programación ${schedule.month}/${schedule.year}`,
        'scheduling',
      );
    }

    return this.getById(id);
  }

  async generateWithMotor(id: string, dto: GenerateMotorDto, userId: string) {
    const schedule = await this.getById(id);
    const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();
    const tipoCiclo = dto.tipoCiclo ?? '12x3';

    let personal = schedule.personal ?? [];
    if (dto.roles?.length) {
      personal = personal.filter((p) => dto.roles!.includes(p.rol));
    }

    const startPositions = await this.resolveStartPositions(
      schedule.postId,
      schedule.year,
      schedule.month,
      personal,
      tipoCiclo,
    );

    const generated = this.motor.generate(
      personal,
      daysInMonth,
      startPositions,
      tipoCiclo,
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ScheduleAssignment, { scheduleId: id });
      const rows = generated.map((a) =>
        manager.create(ScheduleAssignment, {
          scheduleId: id,
          day: a.day,
          role: a.role,
          associateId: a.associateId,
          turno: a.turno,
          jornada: a.jornada,
          codigo: a.codigo,
          inicio: a.inicio,
          fin: a.fin,
        }),
      );
      if (rows.length) {
        await manager.save(rows, { chunk: 200 });
      }
      await manager.update(MonthlySchedule, id, { updatedBy: userId });
    });

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'monthly_schedule.motor',
      entityType: 'monthly_schedule',
      entityId: id,
      newValue: {
        assignments: generated.length,
        tipoCiclo,
        alerts: this.motor.validateBoard(generated, daysInMonth).length,
      },
    });

    const saved = await this.getById(id);
    return {
      ...saved,
      motorAlerts: this.motor.validateBoard(generated, daysInMonth),
    };
  }

  /**
   * Continuidad de ciclo: posición día 1 = última del mes anterior + 1.
   * Si no hay mes anterior, offsets por índice de rol (como APP).
   */
  private async resolveStartPositions(
    postId: string,
    year: number,
    month: number,
    personal: PersonalRole[],
    tipoCiclo: '12x3' | '10x5' | '2x2' | '13x2',
  ): Promise<Record<string, number>> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const previous = await this.schedulesRepo.findOne({
      where: { postId, year: prevYear, month: prevMonth },
      relations: { assignments: true },
    });

    if (!previous?.assignments?.length) {
      return {};
    }

    const daysInPrev = new Date(prevYear, prevMonth, 0).getDate();
    const starts: Record<string, number> = {};

    for (const role of personal) {
      const last = previous.assignments.find(
        (a) => a.role === role.rol && a.day === daysInPrev,
      );
      if (!last) continue;
      const inferred = this.inferPosition(last.codigo, last.jornada, last.turno, tipoCiclo);
      if (inferred !== null) {
        starts[role.rol] = this.motor.normalizePosition(inferred + 1, tipoCiclo);
      }
    }
    return starts;
  }

  private inferPosition(
    codigo: string | null,
    jornada: string,
    turno: string | null,
    tipoCiclo: '12x3' | '10x5' | '2x2' | '13x2',
  ): number | null {
    const config = this.motor.configs[tipoCiclo];
    const code = codigo === 'R' ? 'DR' : codigo;
    for (let i = 0; i < config.phases.length; i++) {
      const f = config.phases[i];
      if (code && f.codigo === code) return i;
      if (
        !code &&
        f.jornada === jornada &&
        (f.turno === turno || (!f.turno && !turno))
      ) {
        return i;
      }
    }
    return null;
  }

  private async getById(id: string): Promise<MonthlySchedule> {
    const schedule = await this.schedulesRepo.findOne({
      where: { id },
      relations: { assignments: true },
    });
    if (!schedule) {
      throw new NotFoundException('Programación no encontrada');
    }
    return schedule;
  }

  /**
   * Hereda el personal del mes anterior; si no existe, usa los roles por defecto.
   */
  private async inheritPersonal(
    postId: string,
    year: number,
    month: number,
  ): Promise<PersonalRole[]> {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const previous = await this.schedulesRepo.findOne({
      where: { postId, year: prevYear, month: prevMonth },
    });

    if (previous?.personal?.length) {
      return previous.personal.map((p) => ({ ...p }));
    }

    return DEFAULT_ROLES.map((r) => ({ ...r }));
  }
}
