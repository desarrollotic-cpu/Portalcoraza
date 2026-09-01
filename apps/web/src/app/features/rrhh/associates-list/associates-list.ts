import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideCircleCheck,
  LucideCircleX,
  LucideFilter,
  LucideRefreshCw,
  LucideSearch,
  LucideSearchX,
  LucideUserPlus,
} from '@lucide/angular';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { Icon } from '../../../shared/components/icon/icon';
import { HrApiService } from '../services/hr-api.service';
import type {
  Associate,
  AssociatesQuery,
  AssociateStatus,
  JobPosition,
  WorkCenter,
  CatalogValue,
} from '../services/hr.types';

const STATUS_LABELS: Record<AssociateStatus, { label: string; color: string }> = {
  ACTIVO: { label: 'Activo', color: 'green' },
  VACACIONES: { label: 'Vacaciones', color: 'amber' },
  SUSPENDIDO: { label: 'Suspendido', color: 'rose' },
  INACTIVO: { label: 'Inactivo', color: 'gray' },
  RETIRADO: { label: 'Retirado', color: 'red' },
};

/**
 * Directorio de asociados con filtros avanzados, búsqueda en tiempo real y
 * semáforo de cumplimiento SST por fila (verde/amarillo/rojo).
 */
@Component({
  selector: 'app-associates-list',
  imports: [CommonModule, FormsModule, RouterLink, Icon, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Directorio"
        [badge]="rangeLabel()"
      >
        <div actions class="hr-page-header__actions">
          <button type="button" class="hr-btn hr-btn-ghost" (click)="refresh()" [disabled]="loading()">
            <app-icon [icon]="icons.Refresh" [size]="16" /> Refrescar
          </button>
          @if (auth.hasPermission('associates.create')) {
            <a routerLink="/rrhh/asociados/nuevo" class="hr-btn hr-btn-primary">
              <app-icon [icon]="icons.UserPlus" [size]="16" /> Nuevo asociado
            </a>
          }
        </div>
      </app-hr-page-header>

      <section class="hr-filters">
        <div class="hr-search">
          <app-icon [icon]="icons.Search" [size]="16" />
          <input
            type="search"
            placeholder="Buscar por documento o nombre..."
            [ngModel]="query.search"
            (ngModelChange)="onSearchChange($event)"
          />
        </div>
        <div class="hr-chips">
          @for (s of statusChips; track s.value) {
            <button
              type="button"
              class="hr-chip"
              [class.active]="query.status === s.value"
              (click)="toggleStatus(s.value)"
            >{{ s.label }}</button>
          }
        </div>
        <select [ngModel]="query.jobPositionId" (ngModelChange)="query.jobPositionId = $event; page.set(1); applyFilters()">
          <option [ngValue]="undefined">Todos los cargos</option>
          @for (p of positions(); track p.id) {
            <option [ngValue]="p.id">{{ p.name }}</option>
          }
        </select>
        <select [ngModel]="query.workCenterId" (ngModelChange)="query.workCenterId = $event; page.set(1); applyFilters()">
          <option [ngValue]="undefined">Todos los centros</option>
          @for (wc of workCenters(); track wc.id) {
            <option [ngValue]="wc.id">{{ wc.code }} — {{ wc.clientName }}</option>
          }
        </select>
        <select [ngModel]="query.educationLevelId" (ngModelChange)="query.educationLevelId = $event; page.set(1); applyFilters()">
          <option [ngValue]="undefined">Todos los niveles educativos</option>
          @for (lvl of educationLevels(); track lvl.id) {
            <option [ngValue]="lvl.id">{{ lvl.value }}</option>
          }
        </select>
        <select [ngModel]="query.isCritical" (ngModelChange)="query.isCritical = $event; page.set(1); applyFilters()">
          <option [ngValue]="undefined">Cualquier criticidad</option>
          <option value="true">Solo cargos críticos</option>
          <option value="false">No críticos</option>
        </select>
      </section>

      @if (loading()) {
        <div class="hr-loading">Cargando asociados...</div>
      } @else if (error()) {
        <div class="hr-error">{{ error() }}</div>
      } @else {
        <div class="hr-table-wrap">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Nivel educativo</th>
                <th>Centro</th>
                <th>Estado</th>
                <th>Ficha</th>
                <th>Antigüedad</th>
                <th>SST</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (a of filtered(); track a.id) {
                <tr>
                  <td class="mono">{{ a.documentNumber }}</td>
                  <td><a [routerLink]="['/rrhh/asociados', a.id]" class="hr-link">{{ a.fullName }}</a></td>
                  <td>
                    {{ a.jobPosition?.name ?? '—' }}
                    @if (a.jobPosition?.isCritical) {
                      <span class="hr-pill-critical">crítico</span>
                    }
                  </td>
                  <td>{{ a.educationLevel?.value ?? '—' }}</td>
                  <td>{{ a.workCenter?.code ?? '—' }}</td>
                  <td>
                    <span class="hr-status" [attr.data-color]="statusColor(a.status)">
                      {{ statusLabel(a.status) }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="hr-ficha"
                      [class.hr-ficha--ok]="isProfileComplete(a)"
                      [class.hr-ficha--incomplete]="!isProfileComplete(a)"
                      [title]="isProfileComplete(a) ? 'Celular, ingreso y cargo registrados' : 'Falta celular, fecha de ingreso o cargo'"
                    >
                      {{ isProfileComplete(a) ? 'Completa' : 'Incompleta' }}
                    </span>
                  </td>
                  <td>{{ a.tenureYears }} a</td>
                  <td>
                    <div class="hr-sst-lights" [title]="complianceTooltip(a)">
                      <span class="hr-sst-light" [class.on]="a.psychophysicalValid">
                        <app-icon [icon]="a.psychophysicalValid ? icons.Check : icons.X" [size]="14" />
                      </span>
                      <span class="hr-sst-light" [class.on]="a.psychosensometricValid">
                        <app-icon [icon]="a.psychosensometricValid ? icons.Check : icons.X" [size]="14" />
                      </span>
                      <span class="hr-sst-light" [class.on]="a.hasSuraPolicy">
                        <app-icon [icon]="a.hasSuraPolicy ? icons.Check : icons.X" [size]="14" />
                      </span>
                    </div>
                  </td>
                  <td>
                    <a [routerLink]="['/rrhh/asociados', a.id]" class="hr-link hr-link-sm">Ver</a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10">
                    <div class="hr-empty-state">
                      <app-icon [icon]="icons.SearchX" [size]="36" />
                      <p>Sin resultados con estos filtros.</p>
                      <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" (click)="clearFilters()">
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (total() > 0) {
          <div class="hr-pagination">
            <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" [disabled]="page() <= 1" (click)="goPage(page() - 1)">
              Anterior
            </button>
            <span class="hr-pagination__meta">Página {{ page() }} de {{ totalPages() }}</span>
            <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">
              Siguiente
            </button>
          </div>
        }
      }
    </div>
  `,
})
export class AssociatesList implements OnInit, OnDestroy {
  private readonly api = inject(HrApiService);
  readonly auth = inject(AuthService);

  readonly icons = {
    Search: LucideSearch,
    SearchX: LucideSearchX,
    Filter: LucideFilter,
    UserPlus: LucideUserPlus,
    Refresh: LucideRefreshCw,
    Check: LucideCircleCheck,
    X: LucideCircleX,
  };

  private readonly search$ = new Subject<void>();
  private searchSub?: Subscription;

  readonly associates = signal<Associate[]>([]);
  readonly positions = signal<JobPosition[]>([]);
  readonly workCenters = signal<WorkCenter[]>([]);
  readonly educationLevels = signal<CatalogValue[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly limit = 50;
  readonly total = signal(0);
  readonly totalPages = signal(1);

  query: AssociatesQuery = { status: 'ACTIVO' };

  readonly filtered = computed(() => this.associates());

  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (!total) return '0';
    const from = (this.page() - 1) * this.limit + 1;
    const to = Math.min(this.page() * this.limit, total);
    return `${from}–${to} de ${total}`;
  });

  readonly statusChips: { value: AssociateStatus | undefined; label: string }[] = [
    { value: undefined, label: 'Todos' },
    { value: 'ACTIVO', label: 'Activos' },
    { value: 'VACACIONES', label: 'Vacaciones' },
    { value: 'SUSPENDIDO', label: 'Suspendidos' },
    { value: 'RETIRADO', label: 'Retirados' },
  ];

  ngOnInit(): void {
    if (this.auth.hasPermission('job_positions.view')) {
      this.api.listJobPositions().subscribe({
        next: (rows) => this.positions.set(rows),
        error: () => {},
      });
    }
    if (this.auth.hasPermission('work_centers.view')) {
      this.api.listWorkCenters().subscribe({
        next: (rows) => this.workCenters.set(rows),
        error: () => {},
      });
    }
    if (this.auth.hasPermission('catalogs.view')) {
      this.api.listCatalog('NIVEL_ESTUDIO').subscribe({
        next: (rows) => this.educationLevels.set(rows),
        error: () => {},
      });
    }
    // Debounce de la búsqueda: 300ms entre pulsaciones para reducir llamadas
    this.searchSub = this.search$.pipe(debounceTime(300)).subscribe(() => this.applyFilters());
    this.applyFilters();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onSearchChange(term: string): void {
    this.query.search = term;
    this.page.set(1);
    this.search$.next();
  }

  refresh(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.query = { status: 'ACTIVO' };
    this.page.set(1);
    this.applyFilters();
  }

  applyFilters(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listAssociates({ ...this.query, page: this.page(), limit: this.limit }).subscribe({
      next: (res) => {
        this.associates.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 403 ? 'Sin permiso' : 'Error cargando asociados');
      },
    });
  }

  goPage(next: number): void {
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.applyFilters();
  }

  toggleStatus(value: AssociateStatus | undefined): void {
    this.query.status = this.query.status === value ? undefined : value;
    this.page.set(1);
    this.applyFilters();
  }

  isProfileComplete(a: Associate): boolean {
    if (typeof a.profileComplete === 'boolean') return a.profileComplete;
    const mobile = (a.mobile ?? '').trim();
    return mobile.length >= 4 && !!a.hireDate && !!a.jobPositionId;
  }

  statusColor(s: AssociateStatus): string {
    return STATUS_LABELS[s]?.color ?? 'gray';
  }

  statusLabel(s: AssociateStatus): string {
    return STATUS_LABELS[s]?.label ?? s;
  }

  complianceTooltip(a: Associate): string {
    return [
      `Psicofísico: ${a.psychophysicalValid ? 'vigente' : 'vencido / faltante'}`,
      `Psicosensométrico: ${a.psychosensometricValid ? 'vigente' : 'vencido / faltante'}`,
      `Póliza SURA: ${a.hasSuraPolicy ? 'vigente' : 'sin cobertura'}`,
    ].join('\n');
  }
}
