import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { ToastService } from '../../../shared/services/toast.service';
import {
  OperacionesApiService,
  OperacionesPost,
  PostType,
} from '../../operaciones/operaciones-api.service';

interface MonthOption {
  key: string;
  label: string;
  year: number;
  month: number;
}

interface TrendPoint {
  key: string;
  label: string;
  short: string;
  started: number;
  ended: number;
}

const TYPE_LABELS: Record<PostType, string> = {
  SERVICIO_ESPECIAL: 'Servicio especial',
  UNIDAD_RESIDENCIAL: 'Unidad residencial',
  HOSPITAL: 'Hospital',
  UNIVERSIDAD: 'Universidad',
  OBRA: 'Obra',
};

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

function inMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

function buildMonthOptions(count = 24, ref = new Date()): MonthOption[] {
  const out: MonthOption[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    out.push({
      key: monthKey(year, month),
      label: monthLabel(year, month),
      year,
      month,
    });
  }
  return out;
}

@Component({
  selector: 'app-reception-posts-dashboard',
  imports: [DatePipe, FormsModule, RouterLink, StatsKpiGrid],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Informe de puestos</h2>
          <p>
            Altas (fecha de creación) y bajas (INACTIVO + última actualización). Filtra un mes
            para ver cuántos y cuáles comenzaron o se acabaron.
          </p>
        </div>
        <div class="head-actions">
          <label class="month-filter">
            <span>Mes del informe</span>
            <select
              [ngModel]="selectedKey()"
              (ngModelChange)="selectedKey.set($event)"
              aria-label="Seleccionar mes del informe"
            >
              @for (m of monthOptions; track m.key) {
                <option [value]="m.key">{{ m.label }}</option>
              }
            </select>
          </label>
          @if (auth.hasPermission('posts.view')) {
            <a class="btn" routerLink="/operaciones/puestos">Catálogo de puestos</a>
          }
        </div>
      </header>

      @if (!auth.hasPermission('posts.view')) {
        <p class="warn-banner" role="status">
          Tu sesión no tiene aún el permiso de puestos. Cierra sesión y vuelve a entrar, o recarga
          la página tras unos segundos.
        </p>
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="overviewKpis()" [loading]="loading()" />

      <section class="month-summary" aria-labelledby="month-summary-title">
        <div class="month-summary-head">
          <h3 id="month-summary-title">{{ selectedLabel() }}</h3>
          <p class="month-summary-copy">
            <strong>{{ startedInMonth().length }}</strong> nuevos ·
            <strong>{{ endedInMonth().length }}</strong> cerrados · neto
            <strong [class.neg]="netMonth() < 0">{{ netMonth() }}</strong>
          </p>
        </div>
        <app-stats-kpi-grid [items]="monthKpis()" [loading]="loading()" />
      </section>

      <div class="charts" aria-label="Gráficas del informe">
        <section class="chart-card" aria-labelledby="chart-month-title">
          <h3 id="chart-month-title">Mes seleccionado</h3>
          <p class="chart-legend">
            <span class="leg leg-new">Nuevos</span>
            <span class="leg leg-end">Cerrados</span>
          </p>
          @if (loading()) {
            <p class="muted">Cargando…</p>
          } @else {
            <div class="compare-bars" role="img" [attr.aria-label]="monthChartAria()">
              <div class="compare-col">
                <span class="compare-val">{{ startedInMonth().length }}</span>
                <div
                  class="compare-bar new"
                  [style.height.%]="barPct(startedInMonth().length)"
                  [title]="'Nuevos: ' + startedInMonth().length"
                ></div>
                <span class="compare-label">Nuevos</span>
              </div>
              <div class="compare-col">
                <span class="compare-val">{{ endedInMonth().length }}</span>
                <div
                  class="compare-bar end"
                  [style.height.%]="barPct(endedInMonth().length)"
                  [title]="'Cerrados: ' + endedInMonth().length"
                ></div>
                <span class="compare-label">Cerrados</span>
              </div>
            </div>
          }
        </section>

        <section class="chart-card chart-card--wide" aria-labelledby="chart-trend-title">
          <h3 id="chart-trend-title">Tendencia (6 meses)</h3>
          <p class="chart-legend">
            <span class="leg leg-new">Nuevos</span>
            <span class="leg leg-end">Cerrados</span>
          </p>
          @if (loading()) {
            <p class="muted">Cargando…</p>
          } @else {
            <div class="trend" role="img" aria-label="Tendencia de altas y bajas en seis meses">
              @for (t of trend(); track t.key) {
                <button
                  type="button"
                  class="trend-col"
                  [class.active]="t.key === selectedKey()"
                  [title]="t.label + ': ' + t.started + ' nuevos, ' + t.ended + ' cerrados'"
                  (click)="selectedKey.set(t.key)"
                >
                  <div class="trend-bars">
                    <div
                      class="trend-bar new"
                      [style.height.%]="trendBarPct(t.started)"
                    ></div>
                    <div
                      class="trend-bar end"
                      [style.height.%]="trendBarPct(t.ended)"
                    ></div>
                  </div>
                  <span class="trend-label">{{ t.short }}</span>
                  <span class="trend-nums">{{ t.started }}/{{ t.ended }}</span>
                </button>
              }
            </div>
            <p class="hint">Clic en un mes de la tendencia para seleccionarlo. Números: nuevos/cerrados.</p>
          }
        </section>
      </div>

      <div class="grid-2">
        <section class="card" aria-labelledby="started-title">
          <h3 id="started-title">
            Comenzaron en {{ selectedLabel() }}
            <span class="count-pill count-pill--ok">{{ startedInMonth().length }}</span>
          </h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Zona</th>
                  <th>Contrato</th>
                  <th>Contacto</th>
                  <th>Armado</th>
                  <th>Creado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (p of startedInMonth(); track p.id) {
                  <tr>
                    <td><code>{{ p.code }}</code></td>
                    <td>
                      <strong>{{ p.name }}</strong>
                      @if (p.address) {
                        <div class="meta">{{ p.address }}</div>
                      }
                    </td>
                    <td>{{ typeLabel(p.type) }}</td>
                    <td>{{ p.clientName || '—' }}</td>
                    <td>{{ p.zone || '—' }}</td>
                    <td>{{ p.contractNumber || '—' }}</td>
                    <td>
                      {{ p.contactName || '—' }}
                      @if (p.phone) {
                        <div class="meta">{{ p.phone }}</div>
                      }
                    </td>
                    <td>{{ p.armed ? 'Sí' : 'No' }}</td>
                    <td>{{ p.createdAt | date: 'dd/MM/yyyy' }}</td>
                    <td>
                      <span class="badge" [class.on]="p.status === 'ACTIVO'">{{ p.status }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="10" class="empty">Ningún puesto nuevo en este mes.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="card" aria-labelledby="ended-title">
          <h3 id="ended-title">
            Se acabaron en {{ selectedLabel() }}
            <span class="count-pill count-pill--warn">{{ endedInMonth().length }}</span>
          </h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Cliente</th>
                  <th>Zona</th>
                  <th>Contrato</th>
                  <th>Contacto</th>
                  <th>Armado</th>
                  <th>Cierre*</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                @for (p of endedInMonth(); track p.id) {
                  <tr>
                    <td><code>{{ p.code }}</code></td>
                    <td>
                      <strong>{{ p.name }}</strong>
                      @if (p.address) {
                        <div class="meta">{{ p.address }}</div>
                      }
                      @if (p.notes) {
                        <div class="meta">{{ p.notes }}</div>
                      }
                    </td>
                    <td>{{ typeLabel(p.type) }}</td>
                    <td>{{ p.clientName || '—' }}</td>
                    <td>{{ p.zone || '—' }}</td>
                    <td>{{ p.contractNumber || '—' }}</td>
                    <td>
                      {{ p.contactName || '—' }}
                      @if (p.phone) {
                        <div class="meta">{{ p.phone }}</div>
                      }
                    </td>
                    <td>{{ p.armed ? 'Sí' : 'No' }}</td>
                    <td>{{ p.updatedAt | date: 'dd/MM/yyyy' }}</td>
                    <td>{{ p.createdAt | date: 'dd/MM/yyyy' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="10" class="empty">Ningún puesto cerrado en este mes.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="hint">* Cierre = última actualización del puesto en estado INACTIVO.</p>
        </section>
      </div>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    .head h2 { margin: 0 0 0.3rem; color: var(--primary-dark, #1e3a5f); font-size: 1.3rem; }
    .head p { margin: 0; color: var(--text-secondary); font-size: 0.92rem; max-width: 42rem; line-height: 1.45; }
    .head-actions { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: flex-end; }
    .month-filter {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .month-filter select {
      min-width: 12rem;
      min-height: 44px;
      padding: 0.45rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--border, var(--coraza-border));
      background: var(--surface, var(--coraza-surface));
      color: var(--text, var(--coraza-text));
      font-size: 0.95rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      background: var(--primary);
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .warn-banner {
      margin: 0;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      background: color-mix(in srgb, #f59e0b 14%, var(--surface, #fff));
      border: 1px solid #fde68a;
      color: #92400e;
      font-size: 0.9rem;
    }
    .error { color: #b91c1c; margin: 0; }
    .muted { margin: 0; color: var(--text-secondary); font-size: 0.88rem; }
    .month-summary {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--border, var(--coraza-border));
      border-radius: 12px;
      background: var(--surface, var(--coraza-surface));
    }
    .month-summary-head h3 {
      margin: 0;
      font-size: 1.05rem;
      text-transform: capitalize;
    }
    .month-summary-copy {
      margin: 0.25rem 0 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .month-summary-copy .neg { color: #b45309; }
    .charts {
      display: grid;
      grid-template-columns: minmax(200px, 280px) 1fr;
      gap: 1rem;
    }
    @media (max-width: 860px) {
      .charts { grid-template-columns: 1fr; }
    }
    .chart-card {
      padding: 1rem 1.1rem;
      border: 1px solid var(--border, var(--coraza-border));
      border-radius: 12px;
      background: var(--surface, var(--coraza-surface));
    }
    .chart-card h3 { margin: 0 0 0.5rem; font-size: 0.95rem; }
    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin: 0 0 0.75rem;
      font-size: 0.78rem;
      color: var(--text-secondary);
    }
    .leg::before {
      content: '';
      display: inline-block;
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 2px;
      margin-right: 0.35rem;
      vertical-align: middle;
    }
    .leg-new::before { background: #2563eb; }
    .leg-end::before { background: #d97706; }
    .compare-bars {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 1.5rem;
      height: 160px;
      padding-top: 0.5rem;
    }
    .compare-col {
      flex: 1;
      max-width: 88px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.3rem;
      height: 100%;
    }
    .compare-val { font-weight: 700; font-size: 1rem; color: var(--primary-dark, #1e3a5f); }
    .compare-bar {
      width: 100%;
      min-height: 4px;
      border-radius: 6px 6px 0 0;
      transition: height 0.25s ease;
    }
    .compare-bar.new { background: #2563eb; }
    .compare-bar.end { background: #d97706; }
    .compare-label { font-size: 0.75rem; color: var(--text-secondary); }
    .trend {
      display: flex;
      align-items: flex-end;
      gap: 0.35rem;
      height: 160px;
    }
    .trend-col {
      flex: 1;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 0.2rem;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      padding: 0.25rem 0.15rem;
      color: inherit;
      min-height: 44px;
    }
    .trend-col:hover, .trend-col:focus-visible {
      background: color-mix(in srgb, var(--primary) 8%, transparent);
      outline: none;
    }
    .trend-col.active {
      border-color: color-mix(in srgb, var(--primary) 45%, var(--border, #e5e7eb));
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .trend-bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 110px;
      width: 100%;
      justify-content: center;
    }
    .trend-bar {
      width: 40%;
      max-width: 18px;
      min-height: 3px;
      border-radius: 3px 3px 0 0;
      transition: height 0.25s ease;
    }
    .trend-bar.new { background: #2563eb; }
    .trend-bar.end { background: #d97706; }
    .trend-label {
      font-size: 0.68rem;
      color: var(--text-secondary);
      text-transform: capitalize;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .trend-nums { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .card {
      padding: 1rem;
      border: 1px solid var(--border, var(--coraza-border));
      border-radius: 12px;
      background: var(--surface, var(--coraza-surface));
    }
    .card h3 {
      margin: 0 0 0.85rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      text-transform: capitalize;
    }
    .count-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .count-pill--ok {
      background: color-mix(in srgb, #2563eb 16%, transparent);
      color: #1d4ed8;
    }
    .count-pill--warn {
      background: color-mix(in srgb, #d97706 18%, transparent);
      color: #b45309;
    }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table { width: 100%; border-collapse: collapse; font-size: 0.84rem; min-width: 720px; }
    th, td {
      text-align: left;
      padding: 0.5rem 0.4rem;
      border-bottom: 1px solid var(--border, #e5e7eb);
      vertical-align: top;
    }
    th {
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    code {
      font-size: 0.8rem;
      background: var(--surface-2, #f3f4f6);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
    }
    .meta { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem; max-width: 16rem; }
    .empty { color: var(--text-secondary); font-style: italic; }
    .hint { margin: 0.6rem 0 0; font-size: 0.75rem; color: var(--text-secondary); }
    .badge {
      display: inline-block;
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      background: #f3f4f6;
      color: #6b7280;
    }
    .badge.on {
      background: color-mix(in srgb, #16a34a 16%, transparent);
      color: #15803d;
    }
    @media (prefers-reduced-motion: reduce) {
      .compare-bar, .trend-bar { transition: none; }
    }
  `,
})
export class ReceptionPostsDashboard implements OnInit {
  private readonly api = inject(OperacionesApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly monthOptions = buildMonthOptions(24);
  readonly selectedKey = signal(
    this.monthOptions[1]?.key ?? this.monthOptions[0]?.key ?? monthKey(new Date().getFullYear(), new Date().getMonth()),
  );

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly posts = signal<OperacionesPost[]>([]);

  private readonly selectedOption = computed(() => {
    const key = this.selectedKey();
    return this.monthOptions.find((m) => m.key === key) ?? this.monthOptions[0]!;
  });

  readonly selectedLabel = computed(() => this.selectedOption().label);

  readonly startedInMonth = computed(() => {
    const { year, month } = this.selectedOption();
    return this.posts()
      .filter((p) => inMonth(p.createdAt, year, month))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  });

  readonly endedInMonth = computed(() => {
    const { year, month } = this.selectedOption();
    return this.posts()
      .filter((p) => p.status === 'INACTIVO' && inMonth(p.updatedAt, year, month))
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  });

  readonly netMonth = computed(
    () => this.startedInMonth().length - this.endedInMonth().length,
  );

  readonly overviewKpis = computed<StatsKpiItem[]>(() => {
    const all = this.posts();
    const active = all.filter((p) => p.status === 'ACTIVO').length;
    return [
      { label: 'Total puestos', value: all.length, hint: 'en catálogo' },
      { label: 'Activos', value: active, hint: 'hoy' },
      { label: 'Inactivos', value: all.length - active, hint: 'hoy' },
      {
        label: 'Mes informe',
        value: this.selectedLabel().split(' ')[0] ?? '—',
        hint: String(this.selectedOption().year),
      },
    ];
  });

  readonly monthKpis = computed<StatsKpiItem[]>(() => {
    const started = this.startedInMonth().length;
    const ended = this.endedInMonth().length;
    return [
      { label: 'Nuevos este mes', value: started, hint: 'por creación' },
      { label: 'Cerrados este mes', value: ended, hint: 'pasaron a INACTIVO', warn: ended > 0 },
      {
        label: 'Neto del mes',
        value: started - ended,
        hint: 'nuevos − cerrados',
        warn: started - ended < 0,
      },
      {
        label: 'Movimientos',
        value: started + ended,
        hint: 'altas + bajas',
      },
    ];
  });

  readonly trend = computed<TrendPoint[]>(() => {
    const all = this.posts();
    const points: TrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = monthKey(year, month);
      const label = monthLabel(year, month);
      points.push({
        key,
        label,
        short: label.split(' ')[0]!.slice(0, 3),
        started: all.filter((p) => inMonth(p.createdAt, year, month)).length,
        ended: all.filter((p) => p.status === 'INACTIVO' && inMonth(p.updatedAt, year, month))
          .length,
      });
    }
    return points;
  });

  private readonly maxCompare = computed(() =>
    Math.max(1, this.startedInMonth().length, this.endedInMonth().length),
  );

  private readonly maxTrend = computed(() =>
    Math.max(1, ...this.trend().flatMap((t) => [t.started, t.ended])),
  );

  ngOnInit(): void {
    this.load();
  }

  typeLabel(type: PostType): string {
    return TYPE_LABELS[type] ?? type;
  }

  barPct(value: number): number {
    return Math.max(4, Math.round((value / this.maxCompare()) * 100));
  }

  trendBarPct(value: number): number {
    return Math.max(3, Math.round((value / this.maxTrend()) * 100));
  }

  monthChartAria(): string {
    return `Mes ${this.selectedLabel()}: ${this.startedInMonth().length} puestos nuevos y ${this.endedInMonth().length} cerrados`;
  }

  private load(): void {
    if (!this.auth.hasPermission('posts.view')) {
      this.loading.set(false);
      this.error.set(null);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.api.listPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los puestos.');
        this.toast.error('Error al cargar puestos');
        this.loading.set(false);
      },
    });
  }
}
