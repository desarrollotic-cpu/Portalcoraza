import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { TenantContext } from '../../common/tenant/tenant.context';
import { TenantQueryRunnerContext } from '../../common/tenant/tenant-query-runner.context';
import { AssociateHistory } from '../associates/entities/associate-history.entity';
import { Associate } from '../associates/entities/associate.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

export type ActivityControlDays = 1 | 7 | 30;

type AreaDef = {
  key: string;
  label: string;
  modules: string[];
  accent: string;
};

/** Evento normalizado (audit_logs o derivado de associate_history). */
type ActivityEvent = {
  id: string;
  userId: string | null;
  module: string;
  action: string;
  createdAt: Date;
  newValue: Record<string, unknown> | null;
  oldValue: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
};

/** Áreas operativas a monitorear (sin submódulos). */
const AREAS: AreaDef[] = [
  { key: 'hr', label: 'Gestión Humana', modules: ['hr', 'associates'], accent: '#3B82F6' },
  { key: 'reception', label: 'Recepción', modules: ['reception'], accent: '#8B5CF6' },
  { key: 'scheduling', label: 'Programación', modules: ['scheduling'], accent: '#06B6D4' },
  {
    key: 'dotacion',
    label: 'Dotación',
    modules: ['deliveries', 'inventory', 'post_equipment'],
    accent: '#F59E0B',
  },
  { key: 'posts', label: 'Puestos / Operaciones', modules: ['posts'], accent: '#10B981' },
  {
    key: 'radio_control',
    label: 'Control',
    modules: ['radio_control'],
    accent: '#0EA5E9',
  },
  { key: 'documental', label: 'Documental', modules: ['documental'], accent: '#EC4899' },
  { key: 'sst', label: 'SST', modules: ['sst'], accent: '#EF4444' },
  { key: 'minuta', label: 'Minuta', modules: ['minuta'], accent: '#14B8A6' },
  { key: 'sig', label: 'SIG', modules: ['sig'], accent: '#6366F1' },
  { key: 'admin', label: 'Administración', modules: ['users', 'auth'], accent: '#64748B' },
];

/** Consultas / acceso: no cuentan como “trabajo” del área. */
const SKIP_ACTIONS = new Set([
  'view_record',
  'gh_legacy_leer_ficha',
  'login',
  'logout',
]);

/** Colombia sin DST: UTC−5 todo el año. */
const BOGOTA_OFFSET = '-05:00';

/** Registros reales de Minuta Virtual (no pasan por audit_logs). */
const MINUTA_FECHA_UNION = `
  SELECT fecha_registro, registrado_por, usuario, id, 'VISITANTE'::text AS tipo,
         COALESCE(nombre_completo, '') AS detalle
  FROM minuta_visitantes WHERE fecha_registro >= $1
  UNION ALL
  SELECT fecha_registro, registrado_por, usuario, id, 'CORRESPONDENCIA',
         COALESCE(clase, '')
  FROM minuta_correspondencia WHERE fecha_registro >= $1
  UNION ALL
  SELECT fecha_registro, registrado_por, usuario, id, 'CONTRATISTA',
         COALESCE(nombre_completo, '')
  FROM minuta_contratistas WHERE fecha_registro >= $1
  UNION ALL
  SELECT fecha_registro, registrado_por, usuario, id, 'DOMICILIARIO',
         COALESCE(empresa, '')
  FROM minuta_domiciliarios WHERE fecha_registro >= $1
  UNION ALL
  SELECT fecha_registro, registrado_por, usuario, id, 'INCIDENTE',
         COALESCE(tipo, '')
  FROM minuta_incidentes WHERE fecha_registro >= $1
  UNION ALL
  SELECT fecha_registro, registrado_por, usuario, id, 'SERVICIO',
         COALESCE(left(anotaciones, 80), '')
  FROM minuta_servicio WHERE fecha_registro >= $1
  UNION ALL
  SELECT fecha_registro, registrado_por, COALESCE(registrado_por, '') AS usuario, id, 'ENTREGA',
         COALESCE(nombre_del_puesto, vigilante_entrante, '')
  FROM minuta_entrega_puesto WHERE fecha_registro >= $1
`;

type NamedActor = { name: string; count: number; lastAt: Date };

@Injectable()
export class ActivityControlService {
  private readonly logger = new Logger(ActivityControlService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(AssociateHistory)
    private readonly historyRepo: Repository<AssociateHistory>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    private readonly ds: DataSource,
  ) {}

  /**
   * Raw SQL en la misma conexión de la request (SET app.tenant_id + RLS).
   * `this.ds.query` usa otro pool → RLS en minuta_* devuelve 0 filas.
   */
  private rawQuery<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const qr = TenantQueryRunnerContext.getOptional();
    if (qr) return qr.query(sql, params) as Promise<T[]>;
    const tenantId = TenantContext.getOptional();
    this.logger.warn(
      `activity-control rawQuery sin QueryRunner tenant=${tenantId ?? 'none'}`,
    );
    return this.ds.query(sql, params) as Promise<T[]>;
  }

  async build(days: ActivityControlDays = 1) {
    const todayStart = this.bogotaStartOfToday();
    const stripDays = 7;
    const lookback = Math.max(days, stripDays);
    const since = this.bogotaStartOfDayOffset(lookback - 1);
    const periodSince = this.bogotaStartOfDayOffset(days - 1);

    const auditRows = await this.auditRepo
      .createQueryBuilder('a')
      .where('a.created_at >= :since', { since })
      .andWhere('a.action NOT IN (:...skip)', { skip: [...SKIP_ACTIONS] })
      .orderBy('a.created_at', 'DESC')
      .take(3000)
      .getMany();

    const events: ActivityEvent[] = auditRows.map((a) => ({
      id: a.id,
      userId: a.userId,
      module: a.module,
      action: a.action,
      createdAt: a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt),
      newValue: a.newValue,
      oldValue: a.oldValue,
      entityType: a.entityType,
      entityId: a.entityId,
    }));

    // Gestión Humana: la bitácora campo-a-campo (associate_history) refleja
    // altas/ediciones aunque algún camino no haya escrito audit_logs.
    const histRows = await this.historyRepo
      .createQueryBuilder('h')
      .where('h.created_at >= :since', { since })
      .andWhere("h.action NOT IN ('ALERTA')")
      .orderBy('h.created_at', 'DESC')
      .take(3000)
      .getMany();

    const histSeen = new Set<string>();
    // Si ya hay audit_logs del mismo día/usuario/asociado/acción, no duplicar con history
    const auditCover = new Set(
      events
        .filter((e) => (e.module === 'hr' || e.module === 'associates') && e.entityType === 'associate')
        .map(
          (e) =>
            `${this.bogotaDayKey(e.createdAt)}|${e.userId ?? ''}|${e.entityId ?? ''}|${e.action}`,
        ),
    );
    for (const h of histRows) {
      const at = h.createdAt instanceof Date ? h.createdAt : new Date(h.createdAt);
      const action = (h.action || 'EDIT').toLowerCase();
      // Una edición con N campos → 1 movimiento (día + usuario + asociado + acción)
      const buckle = `${this.bogotaDayKey(at)}|${h.changedBy ?? ''}|${h.associateId}|${action}`;
      if (histSeen.has(buckle) || auditCover.has(buckle)) continue;
      histSeen.add(buckle);
      events.push({
        id: `hist:${h.id}`,
        userId: h.changedBy,
        module: 'hr',
        action,
        createdAt: at,
        newValue: {
          fieldName: h.fieldName,
          newValue: h.newValue,
          associateId: h.associateId,
        },
        oldValue: h.oldValue ? { oldValue: h.oldValue } : null,
        entityType: 'associate',
        entityId: h.associateId,
      });
    }

    // Control de radio: solo un sample reciente en memoria (evita OOM en Render).
    // KPIs del área se completan abajo con agregados SQL.
    const radioAuditCover = new Set(
      events
        .filter(
          (e) =>
            e.module === 'radio_control' &&
            e.action === 'radio_control.check' &&
            e.entityId,
        )
        .map((e) => e.entityId as string),
    );
    let radioDayCounts = new Map<string, number>();
    let radioActorsAgg: Array<{ userId: string; count: number; lastAt: Date }> = [];
    let radioActorsToday: Array<{ userId: string; count: number; lastAt: Date }> = [];
    try {
      const dayRows = await this.rawQuery<{ day: string; n: number }>(
        `SELECT to_char(c.checked_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS n
         FROM radio_control_checks c
         WHERE c.checked_at >= $1
         GROUP BY 1`,
        [since.toISOString()],
      );
      radioDayCounts = new Map(dayRows.map((r) => [r.day, Number(r.n) || 0]));

      const mapActor = (r: {
        user_id: string;
        n: number;
        last_at: string | Date;
      }) => ({
        userId: r.user_id,
        count: Number(r.n) || 0,
        lastAt: r.last_at instanceof Date ? r.last_at : new Date(r.last_at),
      });

      radioActorsAgg = (
        await this.rawQuery<{ user_id: string; n: number; last_at: string | Date }>(
          `SELECT c.checked_by AS user_id, COUNT(*)::int AS n, MAX(c.checked_at) AS last_at
           FROM radio_control_checks c
           WHERE c.checked_at >= $1 AND c.checked_by IS NOT NULL
           GROUP BY c.checked_by
           ORDER BY last_at DESC
           LIMIT 16`,
          [since.toISOString()],
        )
      ).map(mapActor);

      radioActorsToday = (
        await this.rawQuery<{ user_id: string; n: number; last_at: string | Date }>(
          `SELECT c.checked_by AS user_id, COUNT(*)::int AS n, MAX(c.checked_at) AS last_at
           FROM radio_control_checks c
           WHERE c.checked_at >= $1 AND c.checked_by IS NOT NULL
           GROUP BY c.checked_by
           ORDER BY last_at DESC
           LIMIT 16`,
          [todayStart.toISOString()],
        )
      ).map(mapActor);

      const radioRecent = await this.rawQuery<{
        id: string;
        checked_by: string | null;
        status: string;
        notes: string | null;
        checked_at: string | Date;
        label: string;
        callsign: string | null;
        pass_number: number | null;
      }>(
        `SELECT c.id, c.checked_by, c.status, c.notes, c.checked_at,
                r.label, r.callsign, p.pass_number
         FROM radio_control_checks c
         JOIN radio_control_roster r ON r.id = c.roster_id
         LEFT JOIN radio_control_passes p ON p.id = c.pass_id
         WHERE c.checked_at >= $1
         ORDER BY c.checked_at DESC
         LIMIT 40`,
        [since.toISOString()],
      );
      for (const c of radioRecent) {
        if (radioAuditCover.has(c.id)) continue;
        const at =
          c.checked_at instanceof Date ? c.checked_at : new Date(c.checked_at);
        events.push({
          id: `rc:${c.id}`,
          userId: c.checked_by,
          module: 'radio_control',
          action: 'radio_control.check',
          createdAt: at,
          newValue: {
            label: c.label,
            callsign: c.callsign,
            status: c.status,
            notes: c.notes,
            passNumber: c.pass_number,
          },
          oldValue: null,
          entityType: 'radio_control_check',
          entityId: c.id,
        });
      }
    } catch (err) {
      this.logger.warn(`activity-control radio: ${(err as Error).message}`);
    }

    // Minuta Virtual: fuente de verdad = tablas minuta_* (no audit_logs).
    let minutaDayCounts = new Map<string, number>();
    let minutaActorsWeek: NamedActor[] = [];
    let minutaActorsToday: NamedActor[] = [];
    try {
      const dayRows = await this.rawQuery<{ day: string; n: number }>(
        `SELECT to_char(fecha_registro AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS n
         FROM (${MINUTA_FECHA_UNION}) m
         GROUP BY 1`,
        [since.toISOString()],
      );
      minutaDayCounts = new Map(dayRows.map((r) => [r.day, Number(r.n) || 0]));

      const mapNamed = (r: {
        actor: string;
        n: number;
        last_at: string | Date;
      }): NamedActor => ({
        name: (r.actor || 'Usuario').trim() || 'Usuario',
        count: Number(r.n) || 0,
        lastAt: r.last_at instanceof Date ? r.last_at : new Date(r.last_at),
      });

      minutaActorsWeek = (
        await this.rawQuery<{ actor: string; n: number; last_at: string | Date }>(
          `SELECT COALESCE(NULLIF(trim(registrado_por), ''), NULLIF(trim(usuario), ''), 'Usuario') AS actor,
                  COUNT(*)::int AS n, MAX(fecha_registro) AS last_at
           FROM (${MINUTA_FECHA_UNION}) m
           GROUP BY 1
           ORDER BY last_at DESC
           LIMIT 16`,
          [since.toISOString()],
        )
      ).map(mapNamed);

      minutaActorsToday = (
        await this.rawQuery<{ actor: string; n: number; last_at: string | Date }>(
          `SELECT COALESCE(NULLIF(trim(registrado_por), ''), NULLIF(trim(usuario), ''), 'Usuario') AS actor,
                  COUNT(*)::int AS n, MAX(fecha_registro) AS last_at
           FROM (${MINUTA_FECHA_UNION}) m
           GROUP BY 1
           ORDER BY last_at DESC
           LIMIT 16`,
          [todayStart.toISOString()],
        )
      ).map(mapNamed);

      const minutaRecent = await this.rawQuery<{
        id: string;
        tipo: string;
        detalle: string;
        registrado_por: string | null;
        usuario: string | null;
        fecha_registro: string | Date;
      }>(
        `SELECT id, tipo, detalle, registrado_por, usuario, fecha_registro
         FROM (${MINUTA_FECHA_UNION}) m
         ORDER BY fecha_registro DESC
         LIMIT 40`,
        [since.toISOString()],
      );
      for (const row of minutaRecent) {
        const at =
          row.fecha_registro instanceof Date
            ? row.fecha_registro
            : new Date(row.fecha_registro);
        events.push({
          id: `minuta:${row.tipo}:${row.id}`,
          userId: null,
          module: 'minuta',
          action: `minuta.${row.tipo.toLowerCase()}`,
          createdAt: at,
          newValue: {
            tipo: row.tipo,
            detalle: row.detalle,
            registradoPor: row.registrado_por,
            usuario: row.usuario,
          },
          oldValue: null,
          entityType: 'minuta',
          entityId: row.id,
        });
      }
    } catch (err) {
      this.logger.warn(`activity-control minuta: ${(err as Error).message}`);
    }

    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const userIds = [
      ...new Set([
        ...events.map((r) => r.userId).filter((x): x is string => !!x),
        ...radioActorsAgg.map((a) => a.userId),
        ...radioActorsToday.map((a) => a.userId),
      ]),
    ];
    const users = userIds.length
      ? await this.usersRepo.find({
          where: { id: In(userIds) },
          select: ['id', 'fullName', 'email'],
        })
      : [];
    const nameById = new Map(
      users.map((u) => [u.id, (u.fullName?.trim() || u.email || 'Usuario') as string]),
    );

    const associateIds = this.collectAssociateIds(events);
    const associates = associateIds.length
      ? await this.associatesRepo.find({
          where: { id: In(associateIds) },
          select: ['id', 'firstName', 'secondName', 'firstLastName', 'secondLastName', 'documentNumber'],
        })
      : [];
    const associateLabelById = new Map(
      associates.map((a) => {
        const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const label = a.documentNumber
          ? `${name || 'Asociado'} · ${a.documentNumber}`
          : name || 'Asociado';
        return [a.id, label] as const;
      }),
    );

    const dayKeys = this.lastBogotaDayKeys(stripDays);

    const areas = AREAS.map((area) => {
      const allEvents = events.filter((r) => area.modules.includes(r.module));
      // Deduplicar id (hist vs audit del mismo cambio no siempre coinciden; por id basta)
      const dedup = this.dedupeEvents(allEvents);
      const weekSince = this.bogotaStartOfDayOffset(stripDays - 1);
      const weekEvents = dedup.filter((e) => e.createdAt >= weekSince);
      const periodEvents = dedup.filter((e) => e.createdAt >= periodSince);
      const todayEvents = dedup.filter((e) => e.createdAt >= todayStart);

      const dayStrip = dayKeys.map((dk) => {
        const count = weekEvents.filter((e) => this.bogotaDayKey(e.createdAt) === dk.key).length;
        return {
          date: dk.key,
          label: dk.label,
          weekday: dk.weekday,
          count,
          used: count > 0,
          isToday: dk.key === dayKeys[dayKeys.length - 1].key,
        };
      });

      const daysUsed = dayStrip.filter((d) => d.used).length;
      let idleStreakDays = 0;
      for (let i = dayStrip.length - 1; i >= 0; i--) {
        if (dayStrip[i].used) break;
        idleStreakDays += 1;
      }

      // Actores del KPI “quién”: hoy si hay; si no, del rango seleccionado
      const actorSource = todayEvents.length ? todayEvents : periodEvents;
      const byUser = new Map<string, { name: string; count: number; lastAt: Date }>();
      for (const e of actorSource) {
        if (!e.userId) continue;
        const name = nameById.get(e.userId) ?? 'Usuario';
        const cur = byUser.get(e.userId);
        if (!cur) {
          byUser.set(e.userId, { name, count: 1, lastAt: e.createdAt });
        } else {
          cur.count += 1;
          if (e.createdAt > cur.lastAt) cur.lastAt = e.createdAt;
        }
      }

      const actors = [...byUser.values()]
        .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
        .slice(0, 8);

      // Historial reciente: siempre últimos 7 días (aunque el filtro sea “Hoy”)
      // para no aparentar “cero absoluto” cuando solo falta el día de hoy.
      const recent = weekEvents.slice(0, 12).map((e) => ({
        id: e.id,
        at: e.createdAt,
        action: e.action,
        label: this.label(area.key, e.action),
        userName: e.userId ? (nameById.get(e.userId) ?? null) : null,
        detail: this.detail(e, associateLabelById),
      }));

      // Actores de la semana (para UI cuando hoy está idle)
      const weekByUser = new Map<string, { name: string; count: number; lastAt: Date }>();
      for (const e of weekEvents) {
        if (!e.userId) continue;
        const name = nameById.get(e.userId) ?? 'Usuario';
        const cur = weekByUser.get(e.userId);
        if (!cur) {
          weekByUser.set(e.userId, { name, count: 1, lastAt: e.createdAt });
        } else {
          cur.count += 1;
          if (e.createdAt > cur.lastAt) cur.lastAt = e.createdAt;
        }
      }
      const actorsWeek = [...weekByUser.values()]
        .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
        .slice(0, 8);

      const usedToday = todayEvents.length > 0;
      const lastAt = weekEvents[0]?.createdAt ?? null;

      let statusLabel = usedToday ? 'Activa hoy' : 'Sin actividad hoy';
      if (!usedToday && idleStreakDays >= 2) {
        statusLabel = `Sin uso ${idleStreakDays} días`;
      }

      return {
        key: area.key,
        label: area.label,
        accent: area.accent,
        usedToday,
        status: usedToday ? ('active' as const) : ('idle' as const),
        statusLabel,
        eventCountToday: todayEvents.length,
        eventCountPeriod: periodEvents.length,
        eventCountWeek: weekEvents.length,
        uniqueUsersToday: new Set(todayEvents.map((e) => e.userId).filter(Boolean)).size,
        uniqueUsersPeriod: new Set(periodEvents.map((e) => e.userId).filter(Boolean)).size,
        daysUsedInWeek: daysUsed,
        idleStreakDays,
        dayStrip,
        lastAt,
        actors,
        actorsWeek,
        recent,
        timezone: 'America/Bogota',
      };
    });

    // Completa KPIs con agregados SQL (radio + minuta).
    this.patchAreaFromAgg(areas, 'radio_control', {
      dayCounts: radioDayCounts,
      actorsWeek: radioActorsAgg.map((a) => ({
        name: nameById.get(a.userId) ?? 'Usuario',
        count: a.count,
        lastAt: a.lastAt,
      })),
      actorsToday: radioActorsToday.map((a) => ({
        name: nameById.get(a.userId) ?? 'Usuario',
        count: a.count,
        lastAt: a.lastAt,
      })),
      todayStart,
      days,
    });
    this.patchAreaFromAgg(areas, 'minuta', {
      dayCounts: minutaDayCounts,
      actorsWeek: minutaActorsWeek,
      actorsToday: minutaActorsToday,
      todayStart,
      days,
    });

    const activeToday = areas.filter((a) => a.usedToday).length;

    return {
      generatedAt: new Date().toISOString(),
      timezone: 'America/Bogota',
      days,
      since: periodSince.toISOString(),
      stripDays,
      summary: {
        areasTotal: areas.length,
        areasActiveToday: activeToday,
        areasIdleToday: areas.length - activeToday,
        eventsToday: areas.reduce((n, a) => n + a.eventCountToday, 0),
      },
      areas,
    };
  }

  /** Mezcla conteos SQL en el área (sin inflar memoria con miles de eventos). */
  private patchAreaFromAgg(
    areas: Array<{
      key: string;
      dayStrip: Array<{
        date: string;
        label: string;
        weekday: string;
        count: number;
        used: boolean;
        isToday: boolean;
      }>;
      daysUsedInWeek: number;
      idleStreakDays: number;
      eventCountWeek: number;
      eventCountToday: number;
      eventCountPeriod: number;
      usedToday: boolean;
      status: 'active' | 'idle';
      statusLabel: string;
      uniqueUsersToday: number;
      uniqueUsersPeriod: number;
      actors: NamedActor[];
      actorsWeek: NamedActor[];
      lastAt: Date | null;
      [k: string]: unknown;
    }>,
    key: string,
    src: {
      dayCounts: Map<string, number>;
      actorsWeek: NamedActor[];
      actorsToday: NamedActor[];
      todayStart: Date;
      days: number;
    },
  ): void {
    if (src.dayCounts.size === 0 && src.actorsWeek.length === 0) return;
    const idx = areas.findIndex((a) => a.key === key);
    if (idx < 0) return;
    const area = areas[idx];
    const todayKey = this.bogotaDayKey(src.todayStart);
    const dayStrip = area.dayStrip.map((d) => {
      const count = Math.max(d.count, src.dayCounts.get(d.date) ?? 0);
      return { ...d, count, used: count > 0 };
    });
    let idleStreakDays = 0;
    for (let i = dayStrip.length - 1; i >= 0; i--) {
      if (dayStrip[i].used) break;
      idleStreakDays += 1;
    }
    const eventCountWeek = dayStrip.reduce((n, d) => n + d.count, 0);
    const eventCountToday = src.dayCounts.get(todayKey) ?? area.eventCountToday;
    const periodKeys = new Set(this.lastBogotaDayKeys(src.days).map((d) => d.key));
    const eventCountPeriod = [...src.dayCounts.entries()]
      .filter(([k]) => periodKeys.has(k))
      .reduce((n, [, c]) => n + c, 0);
    const usedToday = eventCountToday > 0;
    const actors =
      usedToday && src.actorsToday.length
        ? src.actorsToday.slice(0, 8)
        : src.actorsWeek.slice(0, 8);
    let statusLabel = usedToday ? 'Activa hoy' : 'Sin actividad hoy';
    if (!usedToday && idleStreakDays >= 2) {
      statusLabel = `Sin uso ${idleStreakDays} días`;
    }
    areas[idx] = {
      ...area,
      dayStrip,
      daysUsedInWeek: dayStrip.filter((d) => d.used).length,
      idleStreakDays,
      eventCountWeek: Math.max(area.eventCountWeek, eventCountWeek),
      eventCountToday: Math.max(area.eventCountToday, eventCountToday),
      eventCountPeriod: Math.max(area.eventCountPeriod, eventCountPeriod),
      usedToday,
      status: usedToday ? ('active' as const) : ('idle' as const),
      statusLabel,
      uniqueUsersToday: usedToday
        ? Math.max(area.uniqueUsersToday, src.actorsToday.length)
        : area.uniqueUsersToday,
      uniqueUsersPeriod: Math.max(area.uniqueUsersPeriod, src.actorsWeek.length),
      actors: actors.length ? actors : area.actors,
      actorsWeek: src.actorsWeek.length ? src.actorsWeek : area.actorsWeek,
      lastAt:
        src.actorsToday[0]?.lastAt ??
        src.actorsWeek[0]?.lastAt ??
        area.lastAt ??
        null,
    };
  }

  /** Evita contar dos veces el mismo id si hist y audit coincidieran. */
  private dedupeEvents(events: ActivityEvent[]): ActivityEvent[] {
    const seen = new Set<string>();
    const out: ActivityEvent[] = [];
    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      out.push(e);
    }
    return out;
  }

  private bogotaDayKey(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  private bogotaStartOfToday(): Date {
    const key = this.bogotaDayKey(new Date());
    return new Date(`${key}T00:00:00${BOGOTA_OFFSET}`);
  }

  private bogotaStartOfDayOffset(daysBack: number): Date {
    const t = this.bogotaStartOfToday().getTime() - daysBack * 86_400_000;
    return new Date(t);
  }

  private lastBogotaDayKeys(n: number): { key: string; label: string; weekday: string }[] {
    const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const out: { key: string; label: string; weekday: string }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = this.bogotaStartOfDayOffset(i);
      const key = this.bogotaDayKey(d);
      // weekday en Bogotá
      const wd = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota',
        weekday: 'short',
      })
        .format(d)
        .toLowerCase()
        .slice(0, 3);
      const map: Record<string, string> = {
        sun: 'dom',
        mon: 'lun',
        tue: 'mar',
        wed: 'mié',
        thu: 'jue',
        fri: 'vie',
        sat: 'sáb',
      };
      out.push({
        key,
        label: String(Number(key.slice(8, 10))),
        weekday: map[wd] ?? weekdays[d.getUTCDay()],
      });
    }
    return out;
  }

  private label(areaKey: string, action: string): string {
    const map: Record<string, string> = {
      create: 'Creación',
      update: 'Actualización',
      edit: 'Edición',
      retire: 'Retiro',
      readmit: 'Reingreso',
      import: 'Importación',
      delete: 'Eliminación',
      register: 'Registro',
      exit: 'Salida',
      deactivate: 'Baja',
      'delivery.create': 'Entrega creada',
      'delivery.confirmed': 'Entrega confirmada',
      'delivery.sign': 'Entrega firmada',
      'monthly_schedule.create': 'Cuadro creado',
      'monthly_schedule.save': 'Cuadro guardado',
      'monthly_schedule.motor': 'Motor ejecutado',
      'correspondence.create': 'Correspondencia',
      'loan.create': 'Préstamo',
      'loan.approve': 'Préstamo aprobado',
      'loan.return': 'Devolución',
      'absence.create': 'Ausencia registrada',
      'absence.update': 'Ausencia actualizada',
      'absence.delete': 'Ausencia eliminada',
      'item.create': 'Ítem inventario',
      'variant.create': 'Variante',
      'radio_control.check': 'Radio marcado',
      'radio_control.fill': 'Pendientes marcados',
      'radio_control.next_pass': 'Pasada cerrada',
      'minuta.visitante': 'Visitante',
      'minuta.correspondencia': 'Correspondencia',
      'minuta.contratista': 'Contratista',
      'minuta.domiciliario': 'Domiciliario',
      'minuta.incidente': 'Incidente',
      'minuta.servicio': 'Novedad de servicio',
      'minuta.entrega': 'Entrega de puesto',
    };
    if (areaKey === 'hr' && action === 'create') return 'Asociado registrado';
    if (areaKey === 'hr' && action === 'edit') return 'Ficha editada';
    if (areaKey === 'hr' && action === 'retire') return 'Asociado retirado';
    if (areaKey === 'hr' && action === 'readmit') return 'Asociado reingresado';
    if (areaKey === 'posts' && action === 'create') return 'Puesto creado';
    if (areaKey === 'posts' && action === 'update') return 'Puesto actualizado';
    if (areaKey === 'radio_control' && action === 'radio_control.check') {
      return 'Radio marcado';
    }
    return map[action] ?? action.replace(/[._]/g, ' ');
  }

  private collectAssociateIds(events: ActivityEvent[]): string[] {
    const ids = new Set<string>();
    for (const e of events) {
      if (e.entityType === 'associate' && e.entityId) ids.add(e.entityId);
      const v = e.newValue ?? e.oldValue;
      if (v && typeof v['associateId'] === 'string' && v['associateId'].trim()) {
        ids.add(v['associateId']);
      }
    }
    return [...ids];
  }

  private detail(
    e: ActivityEvent,
    associateLabelById: Map<string, string>,
  ): string | null {
    const v = e.newValue ?? e.oldValue;
    if (!v) return null;
    if (e.module === 'hr' || e.module === 'associates') {
      const name = [v['firstName'], v['firstLastName']].filter((x) => typeof x === 'string').join(' ');
      const doc = typeof v['documentNumber'] === 'string' ? v['documentNumber'] : '';
      if (name && doc) return `${name} · ${doc}`;
      if (name) return name;
      const associateId =
        typeof v['associateId'] === 'string'
          ? v['associateId']
          : e.entityType === 'associate'
            ? e.entityId
            : null;
      if (associateId && associateLabelById.has(associateId)) {
        return associateLabelById.get(associateId) ?? null;
      }
      return doc || null;
    }
    if (e.module === 'posts') {
      const name = typeof v['name'] === 'string' ? v['name'] : '';
      const code = typeof v['code'] === 'string' ? v['code'] : '';
      return code && name ? `${code} — ${name}` : name || code || null;
    }
    if (e.module === 'reception') {
      const name = [v['firstName'], v['firstSurname']].filter((x) => typeof x === 'string').join(' ');
      return name || null;
    }
    if (e.module === 'radio_control') {
      const label = typeof v['label'] === 'string' ? v['label'] : '';
      const callsign = typeof v['callsign'] === 'string' ? v['callsign'] : '';
      const status = typeof v['status'] === 'string' ? v['status'] : '';
      const pass =
        v['passNumber'] != null && String(v['passNumber']).trim()
          ? `Pasada #${v['passNumber']}`
          : '';
      const parts = [
        callsign && label ? `${callsign} · ${label}` : label || callsign,
        status ? `Estado: ${status}` : '',
        pass,
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : null;
    }
    if (e.module === 'minuta') {
      const tipo = typeof v['tipo'] === 'string' ? v['tipo'] : '';
      const detalle = typeof v['detalle'] === 'string' ? v['detalle'] : '';
      const who =
        (typeof v['registradoPor'] === 'string' && v['registradoPor']) ||
        (typeof v['usuario'] === 'string' && v['usuario']) ||
        '';
      const parts = [tipo, detalle, who].filter(Boolean);
      return parts.length ? parts.join(' · ') : null;
    }
    return null;
  }
}
