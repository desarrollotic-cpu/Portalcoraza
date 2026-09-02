import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { TenantQueryRunnerContext } from '../../common/tenant/tenant-query-runner.context';
import ExcelJS from 'exceljs';
import { AuditService } from '../audit/audit.service';
import {
  Associate,
  AssociateStatus,
} from '../associates/entities/associate.entity';
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
  BoardAlertsQueryDto,
  CreateMonthlyScheduleDto,
  CreateScheduleTemplateDto,
  GenerateMotorDto,
  GenerateMotorGlobalDto,
  GetMonthlyScheduleDto,
  ListMonthlyScheduleDto,
  MonthlyAlertsQueryDto,
  SaveMonthlyScheduleDto,
  UpdateScheduleStatusDto,
} from './dto/monthly-scheduling.dto';
import {
  AlertCellInput,
  AssociateStatusCode,
  AlertType,
  AlertSeverity,
  ScheduleAlertItem,
  computeMonthlyAlerts,
  monthsForAlertsScope,
} from './monthly-alerts.compute';
import { MotorTurnosService } from './motor-turnos.service';

const DEFAULT_ROLES: PersonalRole[] = [
  { rol: 'titular_a', associateId: null, turnoId: 'AM', displayName: 'Titular A' },
  { rol: 'titular_b', associateId: null, turnoId: 'PM', displayName: 'Titular B' },
  { rol: 'relevante', associateId: null, turnoId: 'AM', displayName: 'Relevante' },
];

/** Cache corto en memoria para reportes pesados (alertas / recargos). */
const REPORT_CACHE_TTL_MS = 45_000;

@Injectable()
export class MonthlySchedulingService {
  // ponytail: cache en proceso, techo 45s; upgrade: Redis por tenant si hay >1 instancia
  private readonly reportCache = new Map<string, { at: number; data: unknown }>();

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

  private readReportCache<T>(key: string): T | null {
    const hit = this.reportCache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > REPORT_CACHE_TTL_MS) {
      this.reportCache.delete(key);
      return null;
    }
    return hit.data as T;
  }

  private writeReportCache(key: string, data: unknown): void {
    this.reportCache.set(key, { at: Date.now(), data });
  }

  private clearReportCache(): void {
    this.reportCache.clear();
  }

  /** Usa la transacción de la request (RLS + tenant_id); evita dataSource.transaction suelta. */
  private async runInTenantTx<T>(
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const qr = TenantQueryRunnerContext.getOptional();
    if (qr?.manager) {
      return fn(qr.manager);
    }
    return this.dataSource.transaction(fn);
  }

  async getOne(query: GetMonthlyScheduleDto): Promise<MonthlySchedule | null> {
    return this.schedulesRepo.findOne({
      where: { postId: query.postId, year: query.year, month: query.month },
      relations: { assignments: true },
    });
  }

  /**
   * Periodo operativo a mostrar por defecto:
   * mes actual (Bogotá) si ya tiene asignaciones; si no, el último mes con malla.
   */
  async getActivePeriod(): Promise<{
    year: number;
    month: number;
    source: 'current' | 'latest_with_data';
  }> {
    const today = this.bogotaYmd();
    const currentAssigned = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', {
        year: today.year,
        month: today.month,
      })
      .andWhere('a.associate_id IS NOT NULL')
      .getCount();

    if (currentAssigned > 0) {
      return { year: today.year, month: today.month, source: 'current' };
    }

    const latest = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .select('s.year', 'year')
      .addSelect('s.month', 'month')
      .where('a.associate_id IS NOT NULL')
      .orderBy('s.year', 'DESC')
      .addOrderBy('s.month', 'DESC')
      .limit(1)
      .getRawOne<{ year: string | number; month: string | number }>();

    if (latest) {
      return {
        year: Number(latest.year),
        month: Number(latest.month),
        source: 'latest_with_data',
      };
    }

    return { year: today.year, month: today.month, source: 'current' };
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
      .andWhere(`COALESCE(a.codigo, '') IN ('D', 'N', 'D8', 'N8')`)
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

  async getAlerts(query: MonthlyAlertsQueryDto) {
    const scope = query.scope ?? 'auto';
    const today = this.bogotaYmd();
    const months = monthsForAlertsScope({
      scope,
      year: query.year,
      month: query.month,
      todayYear: today.year,
      todayMonth: today.month,
      todayDay: today.day,
    });

    const cacheKey = `alerts:${scope}:${months.map((m) => `${m.year}-${m.month}`).join(',')}`;
    const cached = this.readReportCache<{
      generatedAt: string;
      months: string[];
      totals: {
        huecos: number;
        inactivos: number;
        conflictos: number;
        carga: number;
      };
      alerts: ScheduleAlertItem[];
    }>(cacheKey);
    if (cached) return cached;

    const alerts: ScheduleAlertItem[] = [];
    const monthLabels: string[] = [];

    for (const m of months) {
      const label = `${m.year}-${String(m.month).padStart(2, '0')}`;
      monthLabels.push(label);
      const [posts, cells] = await Promise.all([
        this.loadMonthPosts(m.year, m.month),
        this.loadAlertCells(m.year, m.month),
      ]);
      const daysInMonth = new Date(m.year, m.month, 0).getDate();
      alerts.push(
        ...computeMonthlyAlerts({ month: label, daysInMonth, cells, posts }),
      );
    }

    const totals = {
      huecos: alerts.filter((a) => a.type === 'hueco_cobertura').length,
      inactivos: alerts.filter((a) => a.type === 'asociado_inactivo').length,
      conflictos: alerts.filter((a) => a.type === 'conflicto_mismo_turno').length,
      carga: alerts.filter((a) => a.type === 'carga_sobre_24').length,
    };

    const result = {
      generatedAt: new Date().toISOString(),
      months: monthLabels,
      totals,
      alerts,
    };
    this.writeReportCache(cacheKey, result);
    return result;
  }

  async getBoardAlerts(query: BoardAlertsQueryDto) {
    const month = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const cells = await this.loadAlertCellsForPost(query.postId, query.year, query.month);
    const daysInMonth = new Date(query.year, query.month, 0).getDate();
    const all = computeMonthlyAlerts({ month, daysInMonth, cells });

    const associateIdsOnPost = new Set(
      cells
        .filter((c) => c.postId === query.postId && c.associateId)
        .map((c) => c.associateId as string),
    );

    const relevant = all.filter((a) => {
      if (a.postId === query.postId) return true;
      if (a.type === 'carga_sobre_24' && a.associateId && associateIdsOnPost.has(a.associateId)) {
        return true;
      }
      if (
        a.type === 'conflicto_mismo_turno' &&
        (a.postId === query.postId || a.otherPostId === query.postId)
      ) {
        return true;
      }
      return false;
    });

    const byDay = new Map<
      number,
      { day: number; types: AlertType[]; severity: AlertSeverity; messages: string[] }
    >();

    for (const a of relevant) {
      if (a.type === 'carga_sobre_24') continue;
      const day = a.day ?? 0;
      if (!day) continue;
      if (a.postId !== query.postId && a.otherPostId !== query.postId) continue;
      // Solo pintar celdas del post pedido
      if (a.postId !== query.postId && a.type !== 'conflicto_mismo_turno') continue;
      const cur = byDay.get(day) ?? {
        day,
        types: [],
        severity: 'warning' as AlertSeverity,
        messages: [],
      };
      if (!cur.types.includes(a.type)) cur.types.push(a.type);
      if (a.severity === 'error') cur.severity = 'error';
      if (!cur.messages.includes(a.message)) cur.messages.push(a.message);
      byDay.set(day, cur);
    }

    return {
      month,
      postId: query.postId,
      cells: [...byDay.values()].sort((a, b) => a.day - b.day),
      associateLoad: relevant.filter((a) => a.type === 'carga_sobre_24'),
      placements: cells
        .filter((c) => c.associateId && (c.codigo === 'D' || c.codigo === 'N' || c.codigo === 'D8' || c.codigo === 'N8'))
        .map((c) => ({
          associateId: c.associateId as string,
          associateName: c.associateName,
          day: c.day,
          shift: (c.codigo === 'D' || c.codigo === 'D8' ? 'D' : 'N') as 'D' | 'N',
          postId: c.postId,
          postName: c.postName,
        })),
    };
  }

  private bogotaYmd(): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const num = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0');
    return { year: num('year'), month: num('month'), day: num('day') };
  }

  private associateDisplayName(a: {
    firstName?: string;
    secondName?: string | null;
    firstLastName?: string;
    secondLastName?: string | null;
  }): string {
    return [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private async loadMonthPosts(
    year: number,
    month: number,
  ): Promise<Array<{ postId: string; postName: string }>> {
    const rows = await this.schedulesRepo
      .createQueryBuilder('s')
      .leftJoin(Post, 'p', 'p.id = s.post_id')
      .where('s.year = :year AND s.month = :month', { year, month })
      .select('s.post_id', 'postId')
      .addSelect(
        `COALESCE(NULLIF(p.code, ''), NULLIF(p.name, ''), LEFT(s.post_id::text, 8))`,
        'postName',
      )
      .getRawMany<{ postId: string; postName: string }>();
    return rows.map((r) => ({
      postId: r.postId,
      postName: r.postName || r.postId.slice(0, 8),
    }));
  }

  private async loadAlertCellsForPost(postId: string, year: number, month: number): Promise<AlertCellInput[]> {
    const postAssocRows = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.post_id = :postId AND s.year = :year AND s.month = :month', { postId, year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .select('DISTINCT a.associate_id', 'associateId')
      .getRawMany<{ associateId: string }>();

    const associateIds = postAssocRows.map((r) => r.associateId).filter(Boolean);

    const qb = this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .leftJoin(Post, 'p', 'p.id = s.post_id')
      .leftJoin(Associate, 'assoc', 'assoc.id = a.associate_id')
      .where('s.year = :year AND s.month = :month', { year, month });

    if (associateIds.length > 0) {
      qb.andWhere('(s.post_id = :postId OR a.associate_id IN (:...associateIds))', {
        postId,
        associateIds,
      });
    } else {
      qb.andWhere('s.post_id = :postId', { postId });
    }

    const rows = await qb
      .select([
        's.post_id AS "postId"',
        `COALESCE(NULLIF(p.code, ''), NULLIF(p.name, ''), LEFT(s.post_id::text, 8)) AS "postName"`,
        'a.day AS day',
        'a.role AS role',
        'a.associate_id AS "associateId"',
        'a.codigo AS codigo',
        'assoc.status AS "associateStatus"',
        'assoc.first_name AS "firstName"',
        'assoc.second_name AS "secondName"',
        'assoc.first_last_name AS "firstLastName"',
        'assoc.second_last_name AS "secondLastName"',
      ])
      .getRawMany<{
        postId: string;
        postName: string;
        day: string | number;
        role: string;
        associateId: string | null;
        codigo: string | null;
        associateStatus: AssociateStatus | null;
        firstName: string | null;
        secondName: string | null;
        firstLastName: string | null;
        secondLastName: string | null;
      }>();

    return rows.map((r) => ({
      postId: r.postId,
      postName: r.postName || r.postId.slice(0, 8),
      day: Number(r.day),
      role: r.role,
      associateId: r.associateId,
      associateName: r.associateId
        ? this.associateDisplayName({
            firstName: r.firstName ?? undefined,
            secondName: r.secondName,
            firstLastName: r.firstLastName ?? undefined,
            secondLastName: r.secondLastName,
          }) || null
        : null,
      associateStatus: (r.associateStatus as AssociateStatusCode | null) ?? null,
      codigo: r.codigo,
    }));
  }

  private async loadAlertCells(year: number, month: number): Promise<AlertCellInput[]> {
    // Solo celdas con señal operativa; huecos usan la lista de puestos del mes.
    const rows = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .leftJoin(Post, 'p', 'p.id = s.post_id')
      .leftJoin(Associate, 'assoc', 'assoc.id = a.associate_id')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere(
        `(a.associate_id IS NOT NULL OR a.codigo IN ('D','N','D8','N8'))`,
      )
      .select([
        's.post_id AS "postId"',
        `COALESCE(NULLIF(p.code, ''), NULLIF(p.name, ''), LEFT(s.post_id::text, 8)) AS "postName"`,
        'a.day AS day',
        'a.role AS role',
        'a.associate_id AS "associateId"',
        'a.codigo AS codigo',
        'assoc.status AS "associateStatus"',
        'assoc.first_name AS "firstName"',
        'assoc.second_name AS "secondName"',
        'assoc.first_last_name AS "firstLastName"',
        'assoc.second_last_name AS "secondLastName"',
      ])
      .getRawMany<{
        postId: string;
        postName: string;
        day: string | number;
        role: string;
        associateId: string | null;
        codigo: string | null;
        associateStatus: AssociateStatus | null;
        firstName: string | null;
        secondName: string | null;
        firstLastName: string | null;
        secondLastName: string | null;
      }>();

    return rows.map((r) => ({
      postId: r.postId,
      postName: r.postName || r.postId.slice(0, 8),
      day: Number(r.day),
      role: r.role,
      associateId: r.associateId,
      associateName: r.associateId
        ? this.associateDisplayName({
            firstName: r.firstName ?? undefined,
            secondName: r.secondName,
            firstLastName: r.firstLastName ?? undefined,
            secondLastName: r.secondLastName,
          }) || null
        : null,
      associateStatus: (r.associateStatus as AssociateStatusCode | null) ?? null,
      codigo: r.codigo,
    }));
  }

  private async collectSaveWarnings(
    schedule: MonthlySchedule,
    dto: SaveMonthlyScheduleDto,
  ): Promise<ScheduleAlertItem[]> {
    const year = schedule.year;
    const month = schedule.month;
    const monthLabel = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const otherCells = (await this.loadAlertCells(year, month)).filter(
      (c) => c.postId !== schedule.postId,
    );

    const associateIds = [
      ...new Set(
        dto.assignments
          .map((a) => a.associateId)
          .filter((id): id is string => !!id),
      ),
    ];
    const statusMap = new Map<string, { status: AssociateStatus; name: string }>();
    if (associateIds.length) {
      const associates = await this.dataSource.getRepository(Associate).find({
        where: { id: In(associateIds) },
      });
      for (const a of associates) {
        statusMap.set(a.id, {
          status: a.status,
          name: this.associateDisplayName(a),
        });
      }
    }

    const post =
      (await this.dataSource.getRepository(Post).findOne({ where: { id: schedule.postId } })) ??
      null;
    const postName =
      post?.code || post?.name || schedule.postId.slice(0, 8);

    const dtoCells: AlertCellInput[] = dto.assignments.map((a) => {
      const info = a.associateId ? statusMap.get(a.associateId) : undefined;
      return {
        postId: schedule.postId,
        postName,
        day: a.day,
        role: a.role,
        associateId: a.associateId ?? null,
        associateName: info?.name ?? null,
        associateStatus: (info?.status as AssociateStatusCode | undefined) ?? null,
        codigo: a.codigo ?? null,
      };
    });

    const alerts = computeMonthlyAlerts({
      month: monthLabel,
      daysInMonth,
      cells: [...otherCells, ...dtoCells],
    });

    return alerts.filter(
      (a) =>
        (a.type === 'asociado_inactivo' || a.type === 'conflicto_mismo_turno') &&
        a.postId === schedule.postId,
    );
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

    if (!dto.confirmWarnings) {
      const warnings = await this.collectSaveWarnings(schedule, dto);
      if (warnings.length) {
        throw new ConflictException({
          code: 'SCHEDULING_WARNINGS',
          message: 'Hay advertencias de programación; confirme para continuar',
          warnings,
        });
      }
    }

    await this.runInTenantTx(async (manager) => {
      await manager.update(MonthlySchedule, id, {
        personal: dto.personal as PersonalRole[],
        updatedBy: userId,
      });

      await manager.delete(ScheduleAssignment, { scheduleId: id });

      const rows = dto.assignments.map((a) =>
        manager.create(ScheduleAssignment, {
          tenantId: schedule.tenantId,
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

    this.clearReportCache();
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
    if (dto.personal?.length) {
      personal = dto.personal as PersonalRole[];
      await this.schedulesRepo.update(id, {
        personal,
        updatedBy: userId,
      });
    }
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

    await this.runInTenantTx(async (manager) => {
      await manager.delete(ScheduleAssignment, { scheduleId: id });
      const rows = generated.map((a) =>
        manager.create(ScheduleAssignment, {
          tenantId: schedule.tenantId,
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
        roles: personal.length,
        alerts: this.motor.validateBoard(generated, daysInMonth).length,
      },
    });

    const updated = await this.getById(id);
    this.clearReportCache();
    return {
      ...updated,
      motorAlerts: this.motor.validateBoard(generated, daysInMonth),
    };
  }

  /**
   * Aplica el motor a todas las programaciones del mes (opcionalmente crea faltantes).
   */
  async generateMotorGlobal(
    dto: GenerateMotorGlobalDto,
    userId: string,
    onProgress?: (p: {
      processed: number;
      total: number;
      ok: number;
      failed: number;
    }) => void | Promise<void>,
  ) {
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

    const total = schedules.length;
    let okCount = 0;
    let failCount = 0;
    if (onProgress) {
      await onProgress({ processed: 0, total, ok: 0, failed: 0 });
    }

    for (const s of schedules) {
      try {
        const out = await this.generateWithMotor(
          s.id,
          { tipoCiclo },
          userId,
        );
        okCount += 1;
        results.push({
          scheduleId: s.id,
          postId: s.postId,
          ok: true,
          assignments: out.assignments?.length ?? 0,
        });
      } catch (err) {
        failCount += 1;
        results.push({
          scheduleId: s.id,
          postId: s.postId,
          ok: false,
          error: err instanceof Error ? err.message : 'Error',
        });
      }
      if (onProgress) {
        await onProgress({
          processed: results.length,
          total,
          ok: okCount,
          failed: failCount,
        });
      }
    }

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'monthly_schedule.motor_global',
      entityType: 'monthly_schedule',
      newValue: {
        year: dto.year,
        month: dto.month,
        tipoCiclo,
        processed: results.length,
        ok: okCount,
        failed: failCount,
      },
    });

    this.clearReportCache();
    return {
      year: dto.year,
      month: dto.month,
      tipoCiclo,
      processed: results.length,
      ok: okCount,
      failed: failCount,
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
  private async catalogPostCounts() {
    const postsRepo = this.dataSource.getRepository(Post);
    const total = await postsRepo.count();
    const active = await postsRepo.count({ where: { status: PostStatus.ACTIVO } });
    return { total, active, inactive: total - active };
  }

  async overview(year: number, month: number) {
    const catalog = await this.catalogPostCounts();
    const postsInMonth = await this.schedulesRepo.count({ where: { year, month } });

    const assignedCells = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .getCount();

    const postsCoveredRow = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .select('COUNT(DISTINCT s.post_id)::int', 'n')
      .getRawOne<{ n: string | number }>();
    const postsCovered = Number(postsCoveredRow?.n ?? 0);

    const distinctAssociatesRow = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .select('COUNT(DISTINCT a.associate_id)::int', 'n')
      .getRawOne<{ n: string | number }>();
    const distinctAssociates = Number(distinctAssociatesRow?.n ?? 0);

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
      catalog,
      kpis: {
        postsInMonth,
        postsCovered,
        postsUncovered: Math.max(0, postsInMonth - postsCovered),
        assignedCells,
        distinctAssociates,
        conflicts: conflicts.length,
        templates: templates.length,
      },
      series,
    };
  }

  /**
   * Cobertura del día actual (Bogotá) + próximo turno con hora de inicio.
   * Solo datos de cuadros mensuales existentes.
   */
  async getTodaySnapshot() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const num = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0');
    const year = num('year');
    const month = num('month');
    const day = num('day');
    const hour = num('hour');
    const minute = num('minute');
    const nowMinutes = hour * 60 + minute;

    const postsInMonth = await this.schedulesRepo.count({ where: { year, month } });

    const coveredTodayRow = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.day = :day', { day })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .select('COUNT(DISTINCT s.post_id)::int', 'n')
      .getRawOne<{ n: string | number }>();
    const postsCoveredToday = Number(coveredTodayRow?.n ?? 0);

    const shiftsToday = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.day = :day', { day })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .getCount();

    const withInicio = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .leftJoin(Post, 'p', 'p.id = s.post_id')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.day = :day', { day })
      .andWhere('a.associate_id IS NOT NULL')
      .andWhere(`a.jornada != 'sin_asignar'`)
      .andWhere('a.inicio IS NOT NULL')
      .select('a.inicio', 'inicio')
      .addSelect('a.turno', 'turno')
      .addSelect(
        `COALESCE(NULLIF(p.code, ''), NULLIF(p.name, ''), LEFT(s.post_id::text, 8))`,
        'postLabel',
      )
      .getRawMany<{ inicio: string; turno: string | null; postLabel: string }>();

    let nextShift: {
      postLabel: string;
      turno: string | null;
      inicio: string;
      minutesUntil: number;
    } | null = null;

    for (const row of withInicio) {
      const m = /^(\d{1,2}):(\d{2})/.exec(String(row.inicio ?? '').trim());
      if (!m) continue;
      const start = Number(m[1]) * 60 + Number(m[2]);
      const minutesUntil = start - nowMinutes;
      if (minutesUntil < 0) continue;
      if (!nextShift || minutesUntil < nextShift.minutesUntil) {
        nextShift = {
          postLabel: row.postLabel,
          turno: row.turno,
          inicio: `${String(m[1]).padStart(2, '0')}:${m[2]}`,
          minutesUntil,
        };
      }
    }

    return {
      year,
      month,
      day,
      postsInMonth,
      postsCoveredToday,
      postsUncoveredToday: Math.max(0, postsInMonth - postsCoveredToday),
      shiftsToday,
      coveragePct:
        postsInMonth > 0 ? Math.round((postsCoveredToday / postsInMonth) * 100) : null,
      nextShift,
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

  /**
   * Obtiene la cobertura operativa del día de hoy (o una fecha específica).
   * Devuelve quién está de turno diurno (D), nocturno (N), relevo, descanso (DR) o novedad en cada puesto.
   */
  async getTodayCoverage(dateIso?: string) {
    let year: number;
    let month: number;
    let day: number;
    if (dateIso) {
      const targetDate = new Date(dateIso);
      year = targetDate.getFullYear();
      month = targetDate.getMonth() + 1;
      day = targetDate.getDate();
    } else {
      const bogota = this.bogotaYmd();
      year = bogota.year;
      month = bogota.month;
      day = bogota.day;
    }

    const schedules = await this.schedulesRepo.find({
      where: { year, month },
    });

    if (!schedules.length) {
      return {
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        year,
        month,
        day,
        posts: [],
        summary: {
          totalPosts: 0,
          coveredPosts: 0,
          uncoveredPosts: 0,
          diurnosCount: 0,
          nocturnosCount: 0,
          descansosCount: 0,
          novedadesCount: 0,
        },
      };
    }

    const scheduleIds = schedules.map((s) => s.id);
    const assignments = await this.assignmentsRepo.find({
      where: {
        scheduleId: In(scheduleIds),
        day,
      },
    });

    const associateIds = [
      ...new Set(
        assignments
          .map((a) => a.associateId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const associates = associateIds.length
      ? await this.dataSource.getRepository(Associate).find({
          where: { id: In(associateIds) },
        })
      : [];
    const associateMap = new Map(associates.map((a) => [a.id, a]));

    const postIds = [...new Set(schedules.map((s) => s.postId))];
    const posts = await this.dataSource.getRepository(Post).find({
      where: { id: In(postIds) },
    });
    const postMap = new Map(posts.map((p) => [p.id, p]));

    const resultPosts = [];
    let diurnosCount = 0;
    let nocturnosCount = 0;
    let descansosCount = 0;
    let novedadesCount = 0;
    let coveredPosts = 0;

    for (const schedule of schedules) {
      const post = postMap.get(schedule.postId);
      if (!post) continue;

      const postAssignments = assignments.filter(
        (a) => a.scheduleId === schedule.id,
      );

      let turnoDia = null;
      let turnoNoche = null;
      const otros = [];

      for (const a of postAssignments) {
        const assoc = a.associateId ? associateMap.get(a.associateId) : null;
        const assocName = assoc
          ? `${assoc.firstName} ${assoc.firstLastName}`.trim()
          : 'Sin Asignar';
        const assocCedula = assoc?.documentNumber ?? '—';
        const phone = assoc?.mobile ?? null;

        const info = {
          role: a.role,
          associateId: a.associateId,
          nombre: assocName,
          cedula: assocCedula,
          telefono: phone,
          codigo: a.codigo,
          jornada: a.jornada,
          turno: a.turno,
          inicio: a.inicio,
          fin: a.fin,
        };

        if (a.codigo === 'D' || a.codigo === 'D8' || (a.jornada === 'normal' && a.turno === 'AM')) {
          turnoDia = info;
          if (a.associateId) diurnosCount++;
        } else if (a.codigo === 'N' || a.codigo === 'N8' || (a.jornada === 'normal' && a.turno === 'PM')) {
          turnoNoche = info;
          if (a.associateId) nocturnosCount++;
        } else if (a.codigo === 'DR' || a.codigo === 'NR' || a.jornada?.startsWith('descanso')) {
          otros.push({ ...info, tipo: 'Descanso' });
          if (a.associateId) descansosCount++;
        } else {
          otros.push({ ...info, tipo: 'Novedad' });
          if (a.associateId) novedadesCount++;
        }
      }

      const isCovered = Boolean(turnoDia?.associateId && turnoNoche?.associateId);
      if (isCovered) coveredPosts++;

      resultPosts.push({
        scheduleId: schedule.id,
        status: schedule.status,
        post: {
          id: post.id,
          code: post.code,
          name: post.name,
          address: post.address ?? null,
          city: post.zone ?? null,
        },
        turnoDia,
        turnoNoche,
        otros,
        isCovered,
      });
    }

    return {
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      month,
      day,
      posts: resultPosts.sort((a, b) => a.post.code.localeCompare(b.post.code)),
      summary: {
        totalPosts: resultPosts.length,
        coveredPosts,
        uncoveredPosts: resultPosts.length - coveredPosts,
        diurnosCount,
        nocturnosCount,
        descansosCount,
        novedadesCount,
      },
    };
  }

  /**
   * Motor de liquidación de horas, recargos y extras mensual (Malla -> Nómina).
   * Calcula automáticamente horas ordinarias, extras diurnas (1.25), recargos nocturnos (0.35),
   * extras nocturnas (1.75) y dominicales/festivos (1.75) según el Código Sustantivo del Trabajo de Colombia.
   */
  async getPayrollRecargos(year: number, month: number) {
    const cacheKey = `payroll:${year}-${month}`;
    const cached = this.readReportCache<{
      year: number;
      month: number;
      daysInMonth: number;
      totalAssociates: number;
      totals: {
        horasOrdinarias: number;
        horasExtrasDiurnas: number;
        recargosNocturnos: number;
        horasExtrasNocturnas: number;
        dominicalesFestivas: number;
        totalHorasLiquidables: number;
      };
      associates: Array<{
        associateId: string;
        nombre: string;
        cedula: string;
        cargo: string;
        puestos: string;
        diasLaborados: number;
        turnosDiurnos: number;
        turnosNocturnos: number;
        descansos: number;
        novedades: number;
        horasOrdinarias: number;
        horasExtrasDiurnas: number;
        recargosNocturnos: number;
        horasExtrasNocturnas: number;
        dominicalesFestivas: number;
        totalHoras: number;
      }>;
    }>(cacheKey);
    if (cached) return cached;

    const assignmentRows = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.schedule', 's')
      .leftJoin(Post, 'p', 'p.id = s.post_id')
      .where('s.year = :year AND s.month = :month', { year, month })
      .andWhere('a.associate_id IS NOT NULL')
      .select([
        'a.associate_id AS "associateId"',
        'a.day AS day',
        'a.codigo AS codigo',
        's.post_id AS "postId"',
        `COALESCE(NULLIF(p.code, ''), '') AS "postCode"`,
        `COALESCE(NULLIF(p.name, ''), '') AS "postName"`,
      ])
      .getRawMany<{
        associateId: string;
        day: string | number;
        codigo: string | null;
        postId: string;
        postCode: string;
        postName: string;
      }>();

    if (!assignmentRows.length) {
      const empty = {
        year,
        month,
        daysInMonth: new Date(year, month, 0).getDate(),
        totalAssociates: 0,
        totals: {
          horasOrdinarias: 0,
          horasExtrasDiurnas: 0,
          recargosNocturnos: 0,
          horasExtrasNocturnas: 0,
          dominicalesFestivas: 0,
          totalHorasLiquidables: 0,
        },
        associates: [] as Array<{
          associateId: string;
          nombre: string;
          cedula: string;
          cargo: string;
          puestos: string;
          diasLaborados: number;
          turnosDiurnos: number;
          turnosNocturnos: number;
          descansos: number;
          novedades: number;
          horasOrdinarias: number;
          horasExtrasDiurnas: number;
          recargosNocturnos: number;
          horasExtrasNocturnas: number;
          dominicalesFestivas: number;
          totalHoras: number;
        }>,
      };
      this.writeReportCache(cacheKey, empty);
      return empty;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const holidays = (await import('./utils/colombia-holidays')).getColombiaHolidays(year);
    const holidayIsoSet = new Set(holidays.map((h) => h.date));

    const byAssociate = new Map<
      string,
      {
        associateId: string;
        puestos: Set<string>;
        assignments: Array<{ day: number; codigo: string | null }>;
      }
    >();

    for (const a of assignmentRows) {
      let entry = byAssociate.get(a.associateId);
      if (!entry) {
        entry = {
          associateId: a.associateId,
          puestos: new Set<string>(),
          assignments: [],
        };
        byAssociate.set(a.associateId, entry);
      }
      entry.assignments.push({ day: Number(a.day), codigo: a.codigo });
      const label = [a.postCode, a.postName].filter(Boolean).join(' - ');
      if (label) entry.puestos.add(label);
    }

    const associateIds = [...byAssociate.keys()];
    const associates = associateIds.length
      ? await this.dataSource
          .getRepository(Associate)
          .createQueryBuilder('assoc')
          .select([
            'assoc.id',
            'assoc.documentNumber',
            'assoc.firstName',
            'assoc.firstLastName',
          ])
          .where('assoc.id IN (:...ids)', { ids: associateIds })
          .getMany()
      : [];
    const associateMap = new Map(associates.map((a) => [a.id, a]));

    const rows = [];
    let sumOrdinarias = 0;
    let sumExtrasDiurnas = 0;
    let sumRecargosNocturnos = 0;
    let sumExtrasNocturnas = 0;
    let sumDominicales = 0;

    for (const [assocId, data] of byAssociate.entries()) {
      const assoc = associateMap.get(assocId);
      const nombre = assoc
        ? `${assoc.firstName} ${assoc.firstLastName}`.trim()
        : 'Asociado';
      const cedula = assoc?.documentNumber ?? '—';
      const cargo = 'Vigilante de Seguridad';

      let countD = 0;
      let countN = 0;
      let countDR = 0;
      let countNovedad = 0;

      let ord = 0;
      let extD = 0;
      let recN = 0;
      let extN = 0;
      let dom = 0;

      for (const assign of data.assignments) {
        const day = assign.day;
        const dateObj = new Date(year, month - 1, day);
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSunday = dateObj.getDay() === 0;
        const isHoliday = holidayIsoSet.has(iso);
        const isFestivo = isSunday || isHoliday;

        const code = assign.codigo;

        if (code === 'D') {
          countD++;
          if (isFestivo) {
            dom += 12;
          } else {
            ord += 8;
            extD += 4;
          }
        } else if (code === 'N') {
          countN++;
          if (isFestivo) {
            dom += 12;
            recN += 5;
          } else {
            ord += 3;
            recN += 5;
            extN += 4;
          }
        } else if (code === 'D8') {
          countD++;
          if (isFestivo) {
            dom += 8;
          } else {
            ord += 8;
          }
        } else if (code === 'N8') {
          countN++;
          if (isFestivo) {
            dom += 8;
            recN += 8;
          } else {
            ord += 8;
            recN += 8;
          }
        } else if (code === 'DR' || code === 'NR') {
          countDR++;
        } else {
          countNovedad++;
        }
      }

      sumOrdinarias += ord;
      sumExtrasDiurnas += extD;
      sumRecargosNocturnos += recN;
      sumExtrasNocturnas += extN;
      sumDominicales += dom;

      rows.push({
        associateId: assocId,
        nombre,
        cedula,
        cargo,
        puestos: Array.from(data.puestos).join(' / ') || 'Sin Puesto Asignado',
        diasLaborados: countD + countN,
        turnosDiurnos: countD,
        turnosNocturnos: countN,
        descansos: countDR,
        novedades: countNovedad,
        horasOrdinarias: ord,
        horasExtrasDiurnas: extD,
        recargosNocturnos: recN,
        horasExtrasNocturnas: extN,
        dominicalesFestivas: dom,
        totalHoras: ord + extD + extN + dom,
      });
    }

    const result = {
      year,
      month,
      daysInMonth,
      totalAssociates: rows.length,
      totals: {
        horasOrdinarias: sumOrdinarias,
        horasExtrasDiurnas: sumExtrasDiurnas,
        recargosNocturnos: sumRecargosNocturnos,
        horasExtrasNocturnas: sumExtrasNocturnas,
        dominicalesFestivas: sumDominicales,
        totalHorasLiquidables: sumOrdinarias + sumExtrasDiurnas + sumExtrasNocturnas + sumDominicales,
      },
      associates: rows.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    };
    this.writeReportCache(cacheKey, result);
    return result;
  }

  /**
   * Genera un libro de Excel oficial (.xlsx) de alta definición con diseño corporativo Coraza.
   */
  async exportPayrollRecargosExcel(year: number, month: number): Promise<Buffer> {
    const report = await this.getPayrollRecargos(year, month);
    const monthNames = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const monthName = monthNames[month - 1] || `MES ${month}`;
    const periodLabel = `${monthName} DE ${year}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Portal Coraza Seguridad C.T.A.';
    wb.lastModifiedBy = 'Sistema Integral Coraza';
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet(`Recargos ${monthName} ${year}`, {
      views: [{ showGridLines: true }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // 1. Banner Superior Corporativo
    ws.mergeCells('A1:N1');
    const titleCell = ws.getCell('A1');
    titleCell.value = '🛡️ CORAZA SEGURIDAD C.T.A. — INFORME OFICIAL DE LIQUIDACIÓN DE RECARGOS Y HORAS';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Navy blue
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 28;

    ws.mergeCells('A2:N2');
    const subCell = ws.getCell('A2');
    subCell.value = `PERIODO DE PROGRAMACIÓN: ${periodLabel}  |  TOTAL ASOCIADOS EVALUADOS: ${report.totalAssociates}  |  TOTAL HORAS: ${report.totals.totalHorasLiquidables}`;
    subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFE2E8F0' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 20;

    ws.mergeCells('A3:N3');
    const metaCell = ws.getCell('A3');
    metaCell.value = `NIT: 811.021.524-8 · Licencia SuperVigilancia Resol. No. 0002848 · PBX: (604) 448 2027 · Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`;
    metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
    metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;

    // Fila 4 vacía
    ws.getRow(4).height = 10;

    // 2. Encabezados de Tabla (Fila 5)
    const headers = [
      'CÉDULA',
      'NOMBRE COMPLETO',
      'CARGO',
      'PUESTOS ASIGNADOS',
      'DÍAS LAB.',
      'TURNOS D',
      'TURNOS N',
      'DESCANSOS',
      'HORAS ORD.',
      'REC. NOCT. (35%)',
      'EXT. DIUR. (1.25)',
      'EXT. NOCT. (1.75)',
      'DOM. Y FEST. (1.75)',
      'TOTAL HORAS',
    ];

    const headerRow = ws.getRow(5);
    headerRow.values = headers;
    headerRow.height = 26;

    headers.forEach((_, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal corporate
      cell.alignment = { horizontal: idx >= 4 ? 'right' : 'left', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0D9488' } },
        left: { style: 'thin', color: { argb: 'FF0D9488' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        right: { style: 'thin', color: { argb: 'FF0D9488' } },
      };
    });

    // 3. Filas de Datos
    const startDataRow = 6;
    let currentRowIdx = startDataRow;

    for (const row of report.associates) {
      const r = ws.getRow(currentRowIdx);
      const isEven = currentRowIdx % 2 === 0;
      const bg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

      r.values = [
        row.cedula,
        row.nombre,
        row.cargo,
        row.puestos,
        row.diasLaborados,
        row.turnosDiurnos,
        row.turnosNocturnos,
        row.descansos,
        row.horasOrdinarias,
        row.recargosNocturnos,
        row.horasExtrasDiurnas,
        row.horasExtrasNocturnas,
        row.dominicalesFestivas,
        row.totalHoras,
      ];
      r.height = 20;

      for (let col = 1; col <= 14; col++) {
        const cell = r.getCell(col);
        cell.font = { name: 'Calibri', size: 9.5, bold: col === 2 || col === 14 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: col === 1 ? 'center' : col >= 5 ? 'right' : 'left',
          vertical: 'middle',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (col >= 5) {
          cell.numFmt = '#,##0';
        }
      }

      currentRowIdx++;
    }

    // 4. Fila de Totales Generales con Fórmulas de Excel
    const totalRow = ws.getRow(currentRowIdx);
    totalRow.height = 24;

    totalRow.getCell(1).value = 'TOTALES:';
    totalRow.getCell(2).value = `${report.associates.length} ASOCIADOS`;
    totalRow.getCell(3).value = '';
    totalRow.getCell(4).value = '';

    const colsToSum = [
      { col: 5, letter: 'E' },
      { col: 6, letter: 'F' },
      { col: 7, letter: 'G' },
      { col: 8, letter: 'H' },
      { col: 9, letter: 'I' },
      { col: 10, letter: 'J' },
      { col: 11, letter: 'K' },
      { col: 12, letter: 'L' },
      { col: 13, letter: 'M' },
      { col: 14, letter: 'N' },
    ];

    for (const s of colsToSum) {
      if (report.associates.length > 0) {
        totalRow.getCell(s.col).value = {
          formula: `SUM(${s.letter}${startDataRow}:${s.letter}${currentRowIdx - 1})`,
        };
      } else {
        totalRow.getCell(s.col).value = 0;
      }
    }

    for (let col = 1; col <= 14; col++) {
      const cell = totalRow.getCell(col);
      cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.alignment = {
        horizontal: col <= 4 ? 'left' : 'right',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      if (col >= 5) {
        cell.numFmt = '#,##0';
      }
    }

    // 5. Anchos de Columna Optimizados
    ws.columns = [
      { width: 14 }, // Cédula
      { width: 36 }, // Nombre
      { width: 24 }, // Cargo
      { width: 44 }, // Puestos
      { width: 12 }, // Días
      { width: 13 }, // Turnos D
      { width: 13 }, // Turnos N
      { width: 13 }, // Descansos
      { width: 15 }, // Horas Ord
      { width: 18 }, // Rec Noct
      { width: 16 }, // Ext Diur
      { width: 16 }, // Ext Noct
      { width: 20 }, // Dom/Fest
      { width: 18 }, // Total Horas
    ];

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

