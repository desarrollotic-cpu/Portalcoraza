import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AssociateHistory } from '../associates/entities/associate-history.entity';
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

@Injectable()
export class ActivityControlService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(AssociateHistory)
    private readonly historyRepo: Repository<AssociateHistory>,
  ) {}

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
      .take(8000)
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
      .take(8000)
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

    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const userIds = [
      ...new Set(events.map((r) => r.userId).filter((x): x is string => !!x)),
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
        detail: this.detail(e),
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
      'absence.create': 'Ausencia',
      'item.create': 'Ítem inventario',
      'variant.create': 'Variante',
    };
    if (areaKey === 'hr' && action === 'create') return 'Asociado registrado';
    if (areaKey === 'hr' && action === 'edit') return 'Ficha editada';
    if (areaKey === 'hr' && action === 'retire') return 'Asociado retirado';
    if (areaKey === 'hr' && action === 'readmit') return 'Asociado reingresado';
    if (areaKey === 'posts' && action === 'create') return 'Puesto creado';
    if (areaKey === 'posts' && action === 'update') return 'Puesto actualizado';
    return map[action] ?? action.replace(/[._]/g, ' ');
  }

  private detail(e: ActivityEvent): string | null {
    const v = e.newValue ?? e.oldValue;
    if (!v) return null;
    if (e.module === 'hr' || e.module === 'associates') {
      const name = [v['firstName'], v['firstLastName']].filter((x) => typeof x === 'string').join(' ');
      const doc = typeof v['documentNumber'] === 'string' ? v['documentNumber'] : '';
      if (name && doc) return `${name} · ${doc}`;
      if (typeof v['associateId'] === 'string') return `Asociado ${String(v['associateId']).slice(0, 8)}…`;
      return name || doc || null;
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
    return null;
  }
}
