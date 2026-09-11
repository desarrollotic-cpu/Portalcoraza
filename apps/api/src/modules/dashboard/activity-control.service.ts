import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

export type ActivityControlDays = 1 | 7 | 30;

type AreaDef = {
  key: string;
  label: string;
  modules: string[];
  accent: string;
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
  { key: 'admin', label: 'Administración', modules: ['users'], accent: '#64748B' },
];

const SKIP_ACTIONS = new Set(['view_record', 'gh_legacy_leer_ficha', 'login', 'logout']);

@Injectable()
export class ActivityControlService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async build(days: ActivityControlDays = 1) {
    const todayStart = this.startOfDay(new Date());
    // Siempre traemos al menos 7 días para la franja de uso diario
    const stripDays = 7;
    const lookback = Math.max(days, stripDays);
    const since = this.startOfDay(new Date());
    since.setDate(since.getDate() - (lookback - 1));

    const periodSince = this.startOfDay(new Date());
    periodSince.setDate(periodSince.getDate() - (days - 1));

    const rows = await this.auditRepo
      .createQueryBuilder('a')
      .where('a.created_at >= :since', { since })
      .andWhere('a.action NOT IN (:...skip)', { skip: [...SKIP_ACTIONS] })
      .orderBy('a.created_at', 'DESC')
      .take(4000)
      .getMany();

    const userIds = [
      ...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x)),
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

    const dayKeys = this.lastDayKeys(stripDays);

    const areas = AREAS.map((area) => {
      const allEvents = rows.filter((r) => area.modules.includes(r.module));
      const periodEvents = allEvents.filter((e) => e.createdAt >= periodSince);
      const todayEvents = allEvents.filter((e) => e.createdAt >= todayStart);

      const dayStrip = dayKeys.map((dk) => {
        const count = allEvents.filter((e) => this.dayKey(e.createdAt) === dk.key).length;
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

      // Actores: en "Hoy" prioriza hoy; si no hay, del periodo seleccionado
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

      const recent = (todayEvents.length ? todayEvents : periodEvents)
        .slice(0, 12)
        .map((e) => ({
          id: e.id,
          at: e.createdAt,
          action: e.action,
          label: this.label(area.key, e.action),
          userName: e.userId ? (nameById.get(e.userId) ?? null) : null,
          detail: this.detail(e),
        }));

      const usedToday = todayEvents.length > 0;
      const lastAt = allEvents[0]?.createdAt ?? null;

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
        uniqueUsersToday: new Set(todayEvents.map((e) => e.userId).filter(Boolean)).size,
        uniqueUsersPeriod: new Set(periodEvents.map((e) => e.userId).filter(Boolean)).size,
        daysUsedInWeek: daysUsed,
        idleStreakDays,
        dayStrip,
        lastAt,
        actors,
        recent,
      };
    });

    const activeToday = areas.filter((a) => a.usedToday).length;

    return {
      generatedAt: new Date().toISOString(),
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

  private startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private lastDayKeys(n: number): { key: string; label: string; weekday: string }[] {
    const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const out: { key: string; label: string; weekday: string }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = this.startOfDay(new Date());
      d.setDate(d.getDate() - i);
      out.push({
        key: this.dayKey(d),
        label: String(d.getDate()),
        weekday: weekdays[d.getDay()],
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
      register: 'Registro',
      exit: 'Salida',
      deactivate: 'Baja',
      'delivery.create': 'Entrega creada',
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
    if (areaKey === 'hr' && action === 'retire') return 'Asociado retirado';
    if (areaKey === 'posts' && action === 'create') return 'Puesto creado';
    if (areaKey === 'posts' && action === 'update') return 'Puesto actualizado';
    return map[action] ?? action.replace(/[._]/g, ' ');
  }

  private detail(e: AuditLog): string | null {
    const v = e.newValue ?? e.oldValue;
    if (!v) return null;
    if (e.module === 'hr' || e.module === 'associates') {
      const name = [v['firstName'], v['firstLastName']].filter((x) => typeof x === 'string').join(' ');
      const doc = typeof v['documentNumber'] === 'string' ? v['documentNumber'] : '';
      if (name && doc) return `${name} · ${doc}`;
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
