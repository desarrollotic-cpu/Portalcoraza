import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { DeliveriesService } from '../deliveries/deliveries.service';
import { OverviewService } from '../documental/services/overview.service';
import { HrDashboardService } from '../hr-dashboard/hr-dashboard.service';
import { InventoryService } from '../inventory/inventory.service';
import { ReceptionService } from '../reception/reception.service';
import { MonthlySchedulingService } from '../scheduling/monthly-scheduling.service';
import { PostsService } from '../posts/posts.service';
import { UsersService } from '../users/users.service';

export type AlertTone = 'critical' | 'warning' | 'info';

export interface CommandAlert {
  id: string;
  tone: AlertTone;
  title: string;
  message: string;
  route: string;
  module: string;
}

export interface CommandHighlight {
  id: string;
  text: string;
  route: string;
  tone: AlertTone;
}

export interface CommandKpi {
  id: string;
  label: string;
  value: number;
  hint?: string;
  deltaPct?: number | null;
  deltaLabel?: string | null;
  route: string;
  warn?: boolean;
  sparkline?: number[];
}

export interface CommandScore {
  key: string;
  label: string;
  value: number | null;
  hint?: string;
}

export type CommandPeriod = 'today' | '7d' | '30d' | 'month';

function periodToDays(period: CommandPeriod): number {
  if (period === 'today') return 1;
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  // este mes: días transcurridos (mín 1)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    day: 'numeric',
  }).formatToParts(new Date());
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  return Math.max(1, day);
}

@Injectable()
export class DashboardCommandCenterService {
  private dashboardCache = new Map<string, { data: any; expires: number }>();

  constructor(
    private readonly hr: HrDashboardService,
    private readonly deliveries: DeliveriesService,
    private readonly inventory: InventoryService,
    private readonly reception: ReceptionService,
    private readonly scheduling: MonthlySchedulingService,
    private readonly documental: OverviewService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly posts: PostsService,
  ) {}

  async build(permissions: string[], period: CommandPeriod = '7d') {
    const cacheKey = `${[...permissions].sort().join(',')}_${period}`;
    const nowTs = Date.now();
    const cached = this.dashboardCache.get(cacheKey);
    if (cached && cached.expires > nowTs) {
      return cached.data;
    }

    const has = (code: string) => permissions.includes(code);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const seriesDays = periodToDays(period);

    const alerts: CommandAlert[] = [];
    const kpis: CommandKpi[] = [];
    const scores: CommandScore[] = [];
    const modules: Record<string, unknown> = {};

    // Secuencial: pooler Supabase session.
    if (has('associates.view')) {
      const hr = await this.hr.overview();
      modules['rrhh'] = hr;
      const active = Number(hr.counts?.ACTIVO ?? 0);
      const inactive = Number(hr.counts?.INACTIVO ?? 0);
      const suspended = Number(hr.counts?.SUSPENDIDO ?? 0);
      const vacation = Number(hr.counts?.VACACIONES ?? 0);
      const roster = active + inactive + suspended + vacation;
      kpis.push({
        id: 'rrhh-active',
        label: 'Asociados activos',
        value: active,
        route: '/rrhh',
      });
      kpis.push({
        id: 'rrhh-roster',
        label: 'Personal en nómina',
        value: roster,
        hint: 'Activos + inactivos + suspendidos + vacaciones',
        route: '/rrhh',
      });
      if (roster > 0) {
        scores.push({
          key: 'personal',
          label: 'Personal',
          value: Math.round((active / roster) * 100),
          hint: `${active} activos de ${roster}`,
        });
      } else {
        scores.push({ key: 'personal', label: 'Personal', value: null, hint: 'Sin datos' });
      }
      const rotation = hr.rotation ?? [];
      if (rotation.length >= 2) {
        const prev = rotation[rotation.length - 2];
        const cur = rotation[rotation.length - 1];
        if (prev.activeAtEnd > 0) {
          const deltaPct = Number(
            (((cur.activeAtEnd - prev.activeAtEnd) / prev.activeAtEnd) * 100).toFixed(1),
          );
          const kpi = kpis.find((k) => k.id === 'rrhh-active');
          if (kpi) {
            kpi.deltaPct = deltaPct;
            kpi.deltaLabel = 'vs mes anterior (rotación)';
            kpi.sparkline = (rotation as Array<{ activeAtEnd: number }>).map((r) => Number(r.activeAtEnd) || 0);
          }
        }
      }
    }

    if (has('inventory.view') || has('deliveries.view')) {
      const dot = await this.deliveries.getOverview();
      const zeroStock = has('inventory.view')
        ? await this.inventory.countZeroStockVariants()
        : 0;
      const deliveredSeries = await this.deliveries.getDeliveredPerDay(seriesDays);
      const withDotacion = Math.max(
        0,
        Number(dot.totalActiveAssociates) - Number(dot.withoutDotacionCount),
      );
      modules['dotacion'] = {
        ...dot,
        zeroStockCount: zeroStock,
        withDotacionCount: withDotacion,
        statusBreakdown: {
          withRecentDelivery: withDotacion,
          withoutRecentDelivery: dot.withoutDotacionCount,
          pendingDeliveries: dot.pendingDeliveries,
        },
        deliveredSeries,
      };

      kpis.push({
        id: 'dot-pending',
        label: 'Dotaciones pendientes',
        value: dot.pendingDeliveries,
        route: '/dotacion/entregas',
        warn: dot.pendingDeliveries > 0,
      });
      kpis.push({
        id: 'dot-low',
        label: 'Stock bajo',
        value: dot.lowStockCount,
        route: '/dotacion/inventario',
        warn: dot.lowStockCount > 0,
        sparkline: deliveredSeries.map((d) => d.count),
      });
      kpis.push({
        id: 'dot-with',
        label: 'Con entrega reciente',
        value: withDotacion,
        hint: 'Activos con entrega en ventana de seguimiento',
        route: '/dotacion',
      });
      kpis.push({
        id: 'dot-without',
        label: 'Sin dotación reciente',
        value: dot.withoutDotacionCount,
        route: '/dotacion/sin-dotacion',
        warn: dot.withoutDotacionCount > 0,
      });

      if (dot.lowStockCount > 0) {
        alerts.push({
          id: 'dot-low-stock',
          tone: 'warning',
          title: 'Stock bajo',
          message: `${dot.lowStockCount} elemento(s) bajo el umbral`,
          route: '/dotacion/inventario',
          module: 'dotacion',
        });
      }
      if (zeroStock > 0) {
        alerts.push({
          id: 'dot-zero',
          tone: 'critical',
          title: 'Stock agotado',
          message: `${zeroStock} registro(s) de almacén en cero`,
          route: '/dotacion/inventario',
          module: 'dotacion',
        });
      }
      if (dot.withoutDotacionCount > 0) {
        alerts.push({
          id: 'dot-without',
          tone: 'warning',
          title: 'Sin dotación',
          message: `${dot.withoutDotacionCount} asociado(s) sin entrega reciente`,
          route: '/dotacion/sin-dotacion',
          module: 'dotacion',
        });
      }
      if (dot.pendingDeliveries > 0) {
        alerts.push({
          id: 'dot-pending',
          tone: 'info',
          title: 'Entregas pendientes',
          message: `${dot.pendingDeliveries} entrega(s) por completar`,
          route: '/dotacion/entregas',
          module: 'dotacion',
        });
      }

      const total = Math.max(dot.totalActiveAssociates, 1);
      const completeRatio = 1 - Math.min(1, dot.withoutDotacionCount / total);
      const stockPenalty = Math.min(30, dot.lowStockCount * 3);
      scores.push({
        key: 'dotacion',
        label: 'Dotación',
        value: Math.max(0, Math.min(100, Math.round(completeRatio * 100 - stockPenalty))),
        hint: `${dot.withoutDotacionCount} sin dotación · ${dot.lowStockCount} stock bajo`,
      });
    }

    if (has('reception.view')) {
      const dash = await this.reception.getDashboard();
      const insights = await this.reception.getCommandInsights(seriesDays);
      modules['recepcion'] = { ...dash, insights, period };

      const today = dash.stats.todayEntries;
      const yesterday = insights.yesterdayEntries;
      let deltaPct: number | null = null;
      let deltaLabel: string | null = null;
      if (period === 'today' && yesterday > 0) {
        deltaPct = Number((((today - yesterday) / yesterday) * 100).toFixed(1));
        deltaLabel = 'vs ayer';
      } else if (insights.previousPeriodEntries > 0) {
        deltaPct = Number(
          (
            ((insights.periodEntries - insights.previousPeriodEntries) /
              insights.previousPeriodEntries) *
            100
          ).toFixed(1),
        );
        deltaLabel = `vs período anterior (${seriesDays}d)`;
      } else if (today > 0 && period === 'today') {
        deltaPct = null;
        deltaLabel = 'Sin entradas ayer para comparar';
      }

      const spark = insights.dailySeries.map((d) => d.entries);

      kpis.push({
        id: 'rec-inside',
        label: 'Visitantes dentro',
        value: dash.stats.insideNow,
        route: '/recepcion',
        warn: dash.stats.insideNow > 20,
      });
      kpis.push({
        id: 'rec-today',
        label: period === 'today' ? 'Entradas del día' : `Entradas (${seriesDays}d)`,
        value: period === 'today' ? today : insights.periodEntries,
        deltaPct,
        deltaLabel,
        route: '/recepcion',
        sparkline: spark,
      });

      if (dash.stats.insideNow > 0) {
        alerts.push({
          id: 'rec-inside',
          tone: 'info',
          title: 'Visitantes dentro',
          message: `${dash.stats.insideNow} persona(s) aún en instalaciones`,
          route: '/recepcion',
          module: 'recepcion',
        });
      }

      const avg14 =
        dash.last14Days.length > 0
          ? dash.last14Days.reduce((s, d) => s + d.entries, 0) / dash.last14Days.length
          : 0;
      if (avg14 > 0) {
        const drift = Math.abs(today - avg14) / avg14;
        scores.push({
          key: 'recepcion',
          label: 'Recepción',
          value: Math.max(0, Math.min(100, Math.round(100 - Math.min(40, drift * 100)))),
          hint: `Hoy ${today} · promedio 14d ${avg14.toFixed(1)}`,
        });
      } else if (dash.last14Days.some((d) => d.entries > 0) || today > 0) {
        scores.push({
          key: 'recepcion',
          label: 'Recepción',
          value: 100,
          hint: 'Sin promedio suficiente; operación con datos',
        });
      } else {
        scores.push({ key: 'recepcion', label: 'Recepción', value: null, hint: 'Sin datos' });
      }
    }

    if (has('posts.view')) {
      const catalog = await this.posts.countSummary();
      modules['operaciones'] = { kpis: catalog };
    }

    if (has('scheduling.view')) {
      const prog = await this.scheduling.overview(year, month);
      const todaySnap = await this.scheduling.getTodaySnapshot();
      modules['programacion'] = { ...prog, today: todaySnap };
      const { postsInMonth, postsCovered, postsUncovered, conflicts } = prog.kpis;
      const catalog = modules['operaciones'] as { kpis: { total: number; active: number } } | undefined;
      const catalogTotal = catalog?.kpis?.total ?? prog.catalog?.total ?? postsInMonth;

      kpis.push({
        id: 'ops-posts-total',
        label: 'Total puestos (catálogo)',
        value: catalogTotal,
        route: '/operaciones/puestos',
      });
      kpis.push({
        id: 'prog-posts',
        label: 'Puestos con cuadro del mes',
        value: postsInMonth,
        route: '/programacion',
      });
      kpis.push({
        id: 'prog-uncovered',
        label: 'Puestos sin cubrir (mes)',
        value: postsUncovered,
        route: '/programacion',
        warn: postsUncovered > 0,
      });
      kpis.push({
        id: 'prog-today-uncovered',
        label: 'Sin cobertura hoy',
        value: todaySnap.postsUncoveredToday,
        route: '/programacion',
        warn: todaySnap.postsUncoveredToday > 0,
      });

      if (todaySnap.postsUncoveredToday > 0) {
        alerts.push({
          id: 'prog-today-uncovered',
          tone: 'warning',
          title: 'Puestos sin cobertura hoy',
          message: `${todaySnap.postsUncoveredToday} puesto(s) sin asignación para el día ${todaySnap.day}`,
          route: '/programacion',
          module: 'programacion',
        });
      }
      if (todaySnap.nextShift) {
        alerts.push({
          id: 'prog-next-shift',
          tone: 'info',
          title: 'Próximo turno',
          message: `${todaySnap.nextShift.postLabel} a las ${todaySnap.nextShift.inicio} (en ${todaySnap.nextShift.minutesUntil} min)`,
          route: '/programacion',
          module: 'programacion',
        });
      }
      if (postsUncovered > 0) {
        alerts.push({
          id: 'prog-uncovered',
          tone: 'warning',
          title: 'Puestos sin cobertura',
          message: `${postsUncovered} puesto(s) del mes sin asignaciones`,
          route: '/programacion',
          module: 'programacion',
        });
      }
      if (conflicts > 0) {
        alerts.push({
          id: 'prog-conflicts',
          tone: 'critical',
          title: 'Conflictos de programación',
          message: `${conflicts} conflicto(s) detectado(s) este mes`,
          route: '/programacion',
          module: 'programacion',
        });
      }

      if (postsInMonth > 0) {
        scores.push({
          key: 'programacion',
          label: 'Programación',
          value: Math.round((postsCovered / postsInMonth) * 100),
          hint: `${postsCovered}/${postsInMonth} puestos con asignaciones · hoy ${todaySnap.coveragePct ?? '—'}%`,
        });
      } else {
        scores.push({
          key: 'programacion',
          label: 'Programación',
          value: null,
          hint: 'Sin cuadros este mes',
        });
      }
    }

    if (has('documental.view')) {
      const analytics = await this.documental.analytics();
      const notifs = await this.documental.notifications();
      modules['documental'] = { analytics, notifications: notifs };

      const alertCount = notifs.totalAlertas ?? notifs.alertas?.length ?? 0;
      kpis.push({
        id: 'doc-alerts',
        label: 'Alertas documentales',
        value: alertCount,
        route: '/documental',
        warn: alertCount > 0,
      });
      kpis.push({
        id: 'doc-loans',
        label: 'Préstamos activos',
        value: analytics.prestamosActivos,
        route: '/documental',
      });

      for (const a of notifs.alertas ?? []) {
        const nivel = String(a.nivel ?? '');
        const tone: AlertTone =
          nivel === 'critico' ? 'critical' : nivel === 'advertencia' ? 'warning' : 'info';
        alerts.push({
          id: `doc-${a.idRegistro}-${a.tipo}`,
          tone,
          title: String(a.titulo ?? 'Alerta documental'),
          message: String(a.mensaje ?? ''),
          route: '/documental',
          module: 'documental',
        });
      }

      scores.push({
        key: 'documental',
        label: 'Documental',
        value: Math.max(0, Math.min(100, 100 - Math.min(100, alertCount * 8))),
        hint: `${alertCount} alerta(s)`,
      });
    }

    if (has('users.view')) {
      const admin = await this.users.overview();
      modules['admin'] = admin;
      kpis.push({
        id: 'admin-active',
        label: 'Usuarios activos',
        value: admin.kpis.usersActive,
        route: '/admin/usuarios',
      });
    }

    const activity = (await this.audit.listRecent(20)).map((row) => ({
      id: row.id,
      module: row.module,
      action: row.action,
      entityType: row.entityType,
      createdAt: row.createdAt,
      label: this.activityLabel(row.module, row.action),
    }));

    const rankedAlerts = this.rankAlerts(alerts);
    const highlights = this.buildHighlights(rankedAlerts, modules, kpis);
    const operationStatus = this.operationStatus(rankedAlerts);

    const result = {
      generatedAt: new Date().toISOString(),
      period,
      seriesDays,
      operationStatus,
      highlights,
      alerts: rankedAlerts.slice(0, 40),
      kpis,
      scores,
      modules,
      activity,
    };

    this.dashboardCache.set(cacheKey, { data: result, expires: Date.now() + 20000 });
    return result;
  }

  private operationStatus(alerts: CommandAlert[]) {
    if (alerts.some((a) => a.tone === 'critical')) {
      return { code: 'critical' as const, label: 'Situación crítica' };
    }
    if (alerts.some((a) => a.tone === 'warning')) {
      return { code: 'attention' as const, label: 'Atención requerida' };
    }
    return { code: 'stable' as const, label: 'Operación estable' };
  }

  private rankAlerts(alerts: CommandAlert[]) {
    const rank = { critical: 0, warning: 1, info: 2 };
    return [...alerts].sort((a, b) => rank[a.tone] - rank[b.tone]);
  }

  private buildHighlights(
    alerts: CommandAlert[],
    modules: Record<string, unknown>,
    kpis: CommandKpi[],
  ): CommandHighlight[] {
    const out: CommandHighlight[] = [];
    for (const a of alerts) {
      if (out.length >= 5) break;
      if (a.tone === 'info' && out.length >= 3) continue;
      out.push({
        id: `h-${a.id}`,
        text: a.message,
        route: a.route,
        tone: a.tone,
      });
    }

    const rec = modules['recepcion'] as
      | {
          insights?: { yesterdayEntries?: number };
          stats?: { todayEntries?: number };
        }
      | undefined;
    if (out.length < 5 && rec?.insights && rec.stats) {
      const y = rec.insights.yesterdayEntries ?? 0;
      const t = rec.stats.todayEntries ?? 0;
      if (y > 0) {
        const pct = Math.round(((t - y) / y) * 100);
        if (Math.abs(pct) >= 10) {
          out.push({
            id: 'h-rec-trend',
            text:
              pct > 0
                ? `El flujo de visitantes aumentó ${pct}% respecto a ayer`
                : `El flujo de visitantes bajó ${Math.abs(pct)}% respecto a ayer`,
            route: '/recepcion',
            tone: pct > 0 ? 'info' : 'warning',
          });
        }
      }
    }

    if (out.length === 0) {
      const active = kpis.find((k) => k.id === 'rrhh-active');
      if (active) {
        out.push({
          id: 'h-ok',
          text: `Operación sin alertas prioritarias · ${active.value} asociados activos`,
          route: '/rrhh',
          tone: 'info',
        });
      } else {
        out.push({
          id: 'h-ok',
          text: 'Sin alertas prioritarias en los módulos disponibles',
          route: '/dashboard',
          tone: 'info',
        });
      }
    }

    return out.slice(0, 5);
  }

  private activityLabel(module: string, action: string): string {
    const mod: Record<string, string> = {
      scheduling: 'Programación',
      auth: 'Acceso',
      hr: 'Gestión Humana',
      associates: 'Asociados',
      inventory: 'Inventario',
      deliveries: 'Dotación',
      reception: 'Recepción',
      documental: 'Documental',
      users: 'Administración',
      posts: 'Puestos',
      minuta: 'Minuta',
    };
    const act: Record<string, string> = {
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
      'monthly_schedule.create': 'Cuadro mensual creado',
      'monthly_schedule.update': 'Cuadro mensual actualizado',
      'monthly_schedule.motor': 'Motor de turnos ejecutado',
      'schedule_template.create': 'Plantilla de programación creada',
      'schedule_template.apply': 'Plantilla aplicada',
      view_record: 'Consulta de registro',
      'variant.create': 'Variante de inventario creada',
      'item.create': 'Elemento de inventario creado',
      'delivery.create': 'Entrega de dotación creada',
      'delivery.sign': 'Entrega firmada',
      'visitor.register': 'Visitante registrado',
      'visitor.exit': 'Salida de visitante',
      'user.create': 'Usuario creado',
      'user.update': 'Usuario actualizado',
    };
    const m = mod[module] ?? module;
    const a = act[action] ?? action.replace(/[._]/g, ' ');
    return `${m}: ${a}`;
  }
}
