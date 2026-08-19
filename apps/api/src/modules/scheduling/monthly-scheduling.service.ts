import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Post, PostStatus } from '../posts/entities/post.entity';
import {
  MonthlySchedule,
  PersonalRole,
  ScheduleStatus,
} from './entities/monthly-schedule.entity';
import { ScheduleAssignment } from './entities/schedule-assignment.entity';
import {
  ScheduleTemplate,
  TemplatePatternItem,
} from './entities/schedule-template.entity';
import {
  CreateMonthlyScheduleDto,
  CreateScheduleTemplateDto,
  GenerateMotorDto,
  GenerateMotorGlobalDto,
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
    @InjectRepository(ScheduleTemplate)
    private readonly templatesRepo: Repository<ScheduleTemplate>,
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

  async listByMonth(query: ListMonthlyScheduleDto) {
    const schedules = await this.schedulesRepo.find({
      where: { year: query.year, month: query.month },
      order: { createdAt: 'ASC' },
    });

    const scheduleIds = schedules.map((s) => s.id);
    const assignments =
      scheduleIds.length === 0
        ? []
        : await this.assignmentsRepo
            .createQueryBuilder('a')
            .select([
              'a.id',
              'a.scheduleId',
              'a.day',
              'a.role',
              'a.associateId',
              'a.turno',
              'a.jornada',
              'a.codigo',
              'a.inicio',
              'a.fin',
            ])
            .where('a.schedule_id IN (:...scheduleIds)', { scheduleIds })
            .andWhere('a.jornada != :sin', { sin: 'sin_asignar' })
            .getMany();

    const bySchedule = new Map<string, ScheduleAssignment[]>();
    for (const a of assignments) {
      const list = bySchedule.get(a.scheduleId) ?? [];
      list.push(a);
      bySchedule.set(a.scheduleId, list);
    }

    const postIds = [...new Set(schedules.map((s) => s.postId))];
    const postRows =
      postIds.length === 0
        ? []
        : await this.dataSource.getRepository(Post).find({
            where: { id: In(postIds) },
          });
    const postMap = new Map(postRows.map((p) => [p.id, p]));

    return schedules.map((s) => {
      const post = postMap.get(s.postId);
      return {
        ...s,
        assignments: bySchedule.get(s.id) ?? [],
        post: post
          ? {
              id: post.id,
              code: post.code,
              name: post.name,
              type: post.type,
              clientName: post.clientName,
              status: post.status,
            }
          : null,
      };
    });
  }

  /**
   * Detecta asociados asignados el mismo día en más de un puesto (mismo mes).
   */
  async findConflicts(query: ListMonthlyScheduleDto) {
    const rows = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', {
        year: query.year,
        month: query.month,
      })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada NOT IN ('sin_asignar')`)
      .andWhere(`COALESCE(a.codigo, '') IN ('D', 'N')`)
      .select([
        'a.associate_id AS "associateId"',
        'a.day AS day',
        'COUNT(DISTINCT s.post_id)::int AS "postCount"',
        'ARRAY_AGG(DISTINCT s.post_id::text) AS "postIds"',
      ])
      .groupBy('a.associate_id')
      .addGroupBy('a.day')
      .having('COUNT(DISTINCT s.post_id) > 1')
      .getRawMany();

    return rows.map((r) => ({
      associateId: r.associateId as string,
      day: Number(r.day),
      postCount: Number(r.postCount),
      postIds: (r.postIds as string[]) ?? [],
    }));
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
   * Aplica el motor a todas las programaciones del mes (opcionalmente crea faltantes).
   */
  async generateMotorGlobal(dto: GenerateMotorGlobalDto, userId: string) {
    const tipoCiclo = dto.tipoCiclo ?? '12x3';
    let schedules = await this.schedulesRepo.find({
      where: { year: dto.year, month: dto.month },
    });

    if (dto.createMissing) {
      const posts = await this.dataSource.getRepository(Post).find({
        where: { status: PostStatus.ACTIVO },
      });
      const have = new Set(schedules.map((s) => s.postId));
      for (const post of posts) {
        if (have.has(post.id)) continue;
        const created = await this.createOrGet(
          { postId: post.id, year: dto.year, month: dto.month },
          userId,
        );
        schedules.push(created);
      }
    }

    const results: Array<{
      scheduleId: string;
      postId: string;
      ok: boolean;
      assignments?: number;
      error?: string;
    }> = [];

    for (const s of schedules) {
      try {
        const out = await this.generateWithMotor(
          s.id,
          { tipoCiclo },
          userId,
        );
        results.push({
          scheduleId: s.id,
          postId: s.postId,
          ok: true,
          assignments: out.assignments?.length ?? 0,
        });
      } catch (err) {
        results.push({
          scheduleId: s.id,
          postId: s.postId,
          ok: false,
          error: err instanceof Error ? err.message : 'Error',
        });
      }
    }

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'monthly_schedule.motor_global',
      entityType: 'monthly_schedule',
      entityId: `${dto.year}-${dto.month}`,
      newValue: {
        tipoCiclo,
        processed: results.length,
        ok: results.filter((r) => r.ok).length,
      },
    });

    return {
      year: dto.year,
      month: dto.month,
      tipoCiclo,
      processed: results.length,
      ok: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  listTemplates() {
    return this.templatesRepo.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Bundle de KPIs del mes para el panel de Programación.
   * Agregaciones SQL (no baja la matriz completa). Secuencial (pooler session).
   */
  async overview(year: number, month: number) {
    const postsInMonth = await this.schedulesRepo.count({ where: { year, month } });

    const assignedCells = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .getCount();

    const assignedRows = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .leftJoin(Post, 'p', 'p.id = s.post_id')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .select('s.post_id', 'postId')
      .addSelect(
        `COALESCE(NULLIF(p.code, ''), NULLIF(p.name, ''), LEFT(s.post_id::text, 8))`,
        'label',
      )
      .addSelect('COUNT(*)::int', 'value')
      .groupBy('s.post_id')
      .addGroupBy('p.code')
      .addGroupBy('p.name')
      .getRawMany<{ postId: string; label: string; value: string | number }>();

    const assignedByPost = new Map(
      assignedRows.map((r) => [
        r.postId,
        { label: r.label || r.postId.slice(0, 8), value: Number(r.value) },
      ]),
    );

    const conflicts = await this.findConflicts({ year, month });
    const templates = await this.listTemplates();

    const conflictByPost = new Map<string, number>();
    for (const c of conflicts) {
      for (const postId of c.postIds ?? []) {
        conflictByPost.set(postId, (conflictByPost.get(postId) ?? 0) + 1);
      }
    }

    let series: Array<{ key: string; label: string; value: number }>;
    if (conflictByPost.size > 0) {
      series = [...conflictByPost.entries()]
        .map(([key, value]) => ({
          key,
          label: assignedByPost.get(key)?.label ?? key.slice(0, 8),
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    } else {
      series = [...assignedByPost.entries()]
        .map(([key, { label, value }]) => ({ key, label, value }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    }

    return {
      year,
      month,
      kpis: {
        postsInMonth,
        assignedCells,
        conflicts: conflicts.length,
        templates: templates.length,
      },
      series,
    };
  }

  async createTemplate(dto: CreateScheduleTemplateDto, userId: string) {
    let personal: PersonalRole[] = [];
    let patron: TemplatePatternItem[] = [];
    let postId = dto.postId ?? null;

    if (dto.fromScheduleId) {
      const schedule = await this.getById(dto.fromScheduleId);
      personal = (schedule.personal ?? []).map((p) => ({ ...p }));
      postId = postId ?? schedule.postId;
      patron = (schedule.assignments ?? []).map((a) => ({
        diaRelativo: a.day,
        rol: a.role,
        turno: a.turno,
        jornada: a.jornada,
        codigo: a.codigo,
      }));
    }

    const saved = await this.templatesRepo.save(
      this.templatesRepo.create({
        name: dto.name.trim(),
        postId,
        personal,
        patron,
        createdBy: userId,
      }),
    );

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'schedule_template.create',
      entityType: 'schedule_template',
      entityId: saved.id,
      newValue: { name: saved.name, patternItems: patron.length },
    });

    return saved;
  }

  async applyTemplate(scheduleId: string, templateId: string, userId: string) {
    const schedule = await this.getById(scheduleId);
    const template = await this.templatesRepo.findOne({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    const personal =
      template.personal?.length > 0
        ? template.personal.map((p) => ({ ...p }))
        : schedule.personal;

    const assignments = (template.patron ?? []).map((p) => ({
      day: p.diaRelativo,
      role: p.rol,
      associateId:
        personal.find((x) => x.rol === p.rol)?.associateId ?? null,
      turno: (p.turno as ScheduleAssignment['turno']) ?? null,
      jornada: p.jornada as ScheduleAssignment['jornada'],
      codigo: p.codigo ?? null,
      inicio: null as string | null,
      fin: null as string | null,
    }));

    return this.save(
      scheduleId,
      { personal, assignments },
      userId,
    );
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
