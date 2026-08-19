import { Injectable, inject } from '@angular/core';
import { Observable, catchError, concatMap, from, map, of, reduce } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AdminApiService } from '../admin/admin-api.service';
import { DocumentalApiService } from '../documental/documental-api.service';
import { InventoryApiService } from '../dotacion/inventory-api.service';
import { MonthlySchedulingApiService } from '../programacion/monthly-scheduling-api.service';
import { ReceptionApiService } from '../reception/reception-api.service';
import { HrApiService } from '../rrhh/services/hr-api.service';

export type DashboardSectionKey =
  | 'rrhh'
  | 'dotacion'
  | 'recepcion'
  | 'programacion'
  | 'documental'
  | 'admin';

export interface DashboardAlertChip {
  id: string;
  label: string;
  value: number;
  tone: 'info' | 'warn' | 'danger';
  route: string;
}

export interface DashboardKpi {
  label: string;
  value: number;
  hint?: string;
  route?: string;
}

export interface DashboardSection {
  key: DashboardSectionKey;
  title: string;
  route: string;
  status: 'ok' | 'error';
  errorMessage?: string;
  kpis: DashboardKpi[];
}

export interface DashboardHome {
  alerts: DashboardAlertChip[];
  sections: DashboardSection[];
}

type LoaderResult = {
  section: DashboardSection;
  alerts: DashboardAlertChip[];
};

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly auth = inject(AuthService);
  private readonly hr = inject(HrApiService);
  private readonly inventory = inject(InventoryApiService);
  private readonly reception = inject(ReceptionApiService);
  private readonly scheduling = inject(MonthlySchedulingApiService);
  private readonly documental = inject(DocumentalApiService);
  private readonly admin = inject(AdminApiService);

  loadHome(): Observable<DashboardHome> {
    const loaders = this.buildLoaders();
    if (!loaders.length) {
      return of({ alerts: [], sections: [] });
    }

    return from(loaders).pipe(
      concatMap((loader) => loader()),
      reduce(
        (acc, part) => {
          acc.sections.push(part.section);
          acc.alerts.push(...part.alerts);
          return acc;
        },
        { sections: [] as DashboardSection[], alerts: [] as DashboardAlertChip[] },
      ),
      map(({ sections, alerts }) => ({
        sections,
        alerts: this.orderAlerts(alerts),
      })),
    );
  }

  private buildLoaders(): Array<() => Observable<LoaderResult>> {
    const loaders: Array<() => Observable<LoaderResult>> = [];

    if (this.auth.hasPermission('associates.view')) {
      loaders.push(() => this.loadRrhh());
    }
    if (this.auth.hasPermission('inventory.view') || this.auth.hasPermission('deliveries.view')) {
      loaders.push(() => this.loadDotacion());
    }
    if (this.auth.hasPermission('reception.view')) {
      loaders.push(() => this.loadRecepcion());
    }
    if (this.auth.hasPermission('scheduling.view')) {
      loaders.push(() => this.loadProgramacion());
    }
    if (this.auth.hasPermission('documental.view')) {
      loaders.push(() => this.loadDocumental());
    }
    if (this.auth.hasPermission('users.view')) {
      loaders.push(() => this.loadAdmin());
    }

    return loaders;
  }

  private loadRrhh(): Observable<LoaderResult> {
    return this.hr.dashboardOverview().pipe(
      map((data) => {
        const active = Number(data.counts?.['ACTIVO'] ?? 0);
        const total = Object.values(data.counts ?? {}).reduce((sum, n) => sum + Number(n || 0), 0);
        return {
          section: {
            key: 'rrhh' as const,
            title: 'Gestión Humana',
            route: '/rrhh',
            status: 'ok' as const,
            kpis: [
              { label: 'Asociados activos', value: active, route: '/rrhh' },
              { label: 'Total en nómina', value: total, hint: 'Todos los estados' },
            ],
          },
          alerts: [
            {
              id: 'rrhh-active',
              label: 'Asociados activos',
              value: active,
              tone: 'info' as const,
              route: '/rrhh',
            },
          ],
        };
      }),
      catchError(() =>
        of({
          section: this.errorSection('rrhh', 'Gestión Humana', '/rrhh'),
          alerts: [],
        }),
      ),
    );
  }

  private loadDotacion(): Observable<LoaderResult> {
    return this.inventory.getDotacionOverview().pipe(
      map((data) => {
        const alerts: DashboardAlertChip[] = [];
        if (data.pendingDeliveries > 0) {
          alerts.push({
            id: 'dot-pending',
            label: 'Dotaciones pendientes',
            value: data.pendingDeliveries,
            tone: 'warn',
            route: '/dotacion/entregas',
          });
        }
        if (data.lowStockCount > 0) {
          alerts.push({
            id: 'dot-stock',
            label: 'Stock bajo',
            value: data.lowStockCount,
            tone: 'danger',
            route: '/dotacion/inventario',
          });
        }
        return {
          section: {
            key: 'dotacion' as const,
            title: 'Dotación',
            route: '/dotacion',
            status: 'ok' as const,
            kpis: [
              { label: 'Pendientes', value: data.pendingDeliveries, route: '/dotacion/entregas' },
              { label: 'Stock bajo', value: data.lowStockCount, route: '/dotacion/inventario' },
              { label: 'Entregadas hoy', value: data.deliveredToday },
              { label: 'Sin dotación', value: data.withoutDotacionCount, route: '/dotacion/sin-dotacion' },
            ],
          },
          alerts,
        };
      }),
      catchError(() =>
        of({
          section: this.errorSection('dotacion', 'Dotación', '/dotacion'),
          alerts: [],
        }),
      ),
    );
  }

  private loadRecepcion(): Observable<LoaderResult> {
    return this.reception.getDashboard().pipe(
      map((data) => {
        const inside = data.stats.insideNow;
        const alerts: DashboardAlertChip[] = [];
        if (inside > 0) {
          alerts.push({
            id: 'rec-inside',
            label: 'Visitantes dentro',
            value: inside,
            tone: 'warn',
            route: '/recepcion',
          });
        }
        return {
          section: {
            key: 'recepcion' as const,
            title: 'Recepción',
            route: '/recepcion',
            status: 'ok' as const,
            kpis: [
              { label: 'Dentro ahora', value: inside, route: '/recepcion' },
              { label: 'Entradas hoy', value: data.stats.todayEntries },
              { label: 'Entradas mes', value: data.stats.monthEntries },
            ],
          },
          alerts,
        };
      }),
      catchError(() =>
        of({
          section: this.errorSection('recepcion', 'Recepción', '/recepcion'),
          alerts: [],
        }),
      ),
    );
  }

  private loadProgramacion(): Observable<LoaderResult> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return this.scheduling.getMonthlyOverview(year, month).pipe(
      map((data) => {
        const alerts: DashboardAlertChip[] = [];
        if (data.kpis.conflicts > 0) {
          alerts.push({
            id: 'prog-conflicts',
            label: 'Conflictos programación',
            value: data.kpis.conflicts,
            tone: 'danger',
            route: '/programacion',
          });
        }
        return {
          section: {
            key: 'programacion' as const,
            title: 'Programación',
            route: '/programacion',
            status: 'ok' as const,
            kpis: [
              { label: 'Puestos en mes', value: data.kpis.postsInMonth },
              { label: 'Celdas asignadas', value: data.kpis.assignedCells },
              { label: 'Conflictos', value: data.kpis.conflicts, route: '/programacion' },
              { label: 'Plantillas', value: data.kpis.templates },
            ],
          },
          alerts,
        };
      }),
      catchError(() =>
        of({
          section: this.errorSection('programacion', 'Programación', '/programacion'),
          alerts: [],
        }),
      ),
    );
  }

  private loadDocumental(): Observable<LoaderResult> {
    return this.documental.analytics().pipe(
      concatMap((analytics) =>
        this.documental.notifications().pipe(
          map((notifs) => ({ analytics, notifs })),
          catchError(() => of({ analytics, notifs: { totalAlertas: 0, alertas: [] } })),
        ),
      ),
      map(({ analytics, notifs }) => {
        const alertCount = notifs.totalAlertas || notifs.alertas?.length || 0;
        const alerts: DashboardAlertChip[] = [];
        if (alertCount > 0) {
          alerts.push({
            id: 'doc-alerts',
            label: 'Alertas documentales',
            value: alertCount,
            tone: 'warn',
            route: '/documental',
          });
        }
        return {
          section: {
            key: 'documental' as const,
            title: 'Documental',
            route: '/documental',
            status: 'ok' as const,
            kpis: [
              { label: 'Correspondencia', value: analytics.correspondencia },
              { label: 'Minutas', value: analytics.minutas },
              { label: 'Préstamos activos', value: analytics.prestamosActivos },
              { label: 'Alertas', value: alertCount, route: '/documental' },
            ],
          },
          alerts,
        };
      }),
      catchError(() =>
        of({
          section: this.errorSection('documental', 'Documental', '/documental'),
          alerts: [],
        }),
      ),
    );
  }

  private loadAdmin(): Observable<LoaderResult> {
    return this.admin.getUsersOverview().pipe(
      map((data) => ({
        section: {
          key: 'admin' as const,
          title: 'Administración',
          route: '/admin',
          status: 'ok' as const,
          kpis: [
            { label: 'Usuarios activos', value: data.kpis.usersActive, route: '/admin/usuarios' },
            { label: 'Inactivos', value: data.kpis.usersInactive },
            { label: 'Roles', value: data.kpis.roles, route: '/admin/roles' },
          ],
        },
        alerts: [] as DashboardAlertChip[],
      })),
      catchError(() =>
        of({
          section: this.errorSection('admin', 'Administración', '/admin'),
          alerts: [],
        }),
      ),
    );
  }

  private errorSection(
    key: DashboardSectionKey,
    title: string,
    route: string,
  ): DashboardSection {
    return {
      key,
      title,
      route,
      status: 'error',
      errorMessage: 'No se pudieron cargar los indicadores',
      kpis: [],
    };
  }

  private orderAlerts(alerts: DashboardAlertChip[]): DashboardAlertChip[] {
    const rank = { danger: 0, warn: 1, info: 2 };
    return [...alerts]
      .sort((a, b) => rank[a.tone] - rank[b.tone])
      .slice(0, 6);
  }
}
