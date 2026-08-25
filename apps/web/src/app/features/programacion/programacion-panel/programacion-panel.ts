import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MonthlySchedulingApiService,
  ProgramacionOverview,
  TodayCoverageResponse,
} from '../monthly-scheduling-api.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { StatsMiniBars } from '../../../shared/components/stats-mini-bars/stats-mini-bars';

@Component({
  selector: 'app-programacion-panel',
  imports: [FormsModule, RouterLink, StatsKpiGrid, StatsMiniBars],
  template: `
    <div class="prog-panel">
      <header class="prog-panel__head">
        <div>
          <h2>Panel de Programación Operativa</h2>
          <p>Supervisión de turnos de hoy, matriz mensual y liquidación de recargos.</p>
        </div>
        <div class="head-actions">
          <a routerLink="/programacion/cuadro" class="btn-primary">📅 Cuadro Mensual</a>
          <a routerLink="/programacion/recargos" class="btn-secondary">💰 Liquidación Recargos</a>
        </div>
      </header>

      @if (error()) {
        <p class="prog-panel__error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      <!-- WIDGET: COBERTURA OPERATIVA DE HOY EN TIEMPO REAL -->
      <section class="today-card">
        <div class="today-card__head">
          <div class="today-title">
            <span class="live-dot"></span>
            <h3>📍 Turno de Hoy — Cobertura Operativa en Tiempo Real</h3>
            <span class="today-date-badge">{{ todayData()?.date || 'Hoy' }}</span>
          </div>
          <div class="today-search">
            <input
              type="text"
              placeholder="Buscar puesto o vigilante..."
              [(ngModel)]="searchFilter"
              class="inp-search"
            />
          </div>
        </div>

        @if (todayLoading()) {
          <p class="loading-text">Consultando guardias asignados para hoy...</p>
        } @else if (!todayData()?.posts?.length) {
          <div class="empty-today">
            <p>No se encontraron programaciones activas para el día de hoy.</p>
            <a routerLink="/programacion/cuadro" class="btn-link">Crear o autoprogramar turnos en el Cuadro Mensual →</a>
          </div>
        } @else {
          <!-- MINI RESUMEN DEL DÍA -->
          <div class="today-summary-bar">
            <div class="sum-item diurno">
              <span class="sum-icon">☀️</span>
              <div>
                <strong>{{ todayData()!.summary.diurnosCount }}</strong>
                <span>Diurnos 12h</span>
              </div>
            </div>
            <div class="sum-item nocturno">
              <span class="sum-icon">🌙</span>
              <div>
                <strong>{{ todayData()!.summary.nocturnosCount }}</strong>
                <span>Nocturnos 12h</span>
              </div>
            </div>
            <div class="sum-item covered">
              <span class="sum-icon">🛡️</span>
              <div>
                <strong>{{ todayData()!.summary.coveredPosts }} / {{ todayData()!.summary.totalPosts }}</strong>
                <span>Puestos Cubiertos</span>
              </div>
            </div>
            <div class="sum-item descansos">
              <span class="sum-icon">🏖️</span>
              <div>
                <strong>{{ todayData()!.summary.descansosCount }}</strong>
                <span>En Descanso</span>
              </div>
            </div>
          </div>

          <!-- LISTA DE PUESTOS Y GUARDIAS DE HOY -->
          <div class="today-posts-grid">
            @for (p of filteredTodayPosts(); track p.scheduleId) {
              <div class="post-card" [class.uncovered]="!p.isCovered">
                <div class="post-card__header">
                  <div>
                    <strong class="post-code">[{{ p.post.code }}]</strong>
                    <strong class="post-name">{{ p.post.name }}</strong>
                  </div>
                  <span class="badge-status" [class.ok]="p.isCovered" [class.warn]="!p.isCovered">
                    {{ p.isCovered ? '✅ Cubierto' : '⚠️ Incompleto' }}
                  </span>
                </div>

                <div class="shifts-list">
                  <!-- TURNO DÍA -->
                  <div class="shift-row day-shift">
                    <span class="shift-tag tag-day">☀️ DÍA (06-18)</span>
                    @if (p.turnoDia?.associateId) {
                      <div class="guard-info">
                        <strong class="guard-name">{{ p.turnoDia!.nombre }}</strong>
                        <span class="guard-sub">CC: {{ p.turnoDia!.cedula }}</span>
                      </div>
                    } @else {
                      <span class="guard-empty">Sin guardia asignado</span>
                    }
                  </div>

                  <!-- TURNO NOCHE -->
                  <div class="shift-row night-shift">
                    <span class="shift-tag tag-night">🌙 NOCHE (18-06)</span>
                    @if (p.turnoNoche?.associateId) {
                      <div class="guard-info">
                        <strong class="guard-name">{{ p.turnoNoche!.nombre }}</strong>
                        <span class="guard-sub">CC: {{ p.turnoNoche!.cedula }}</span>
                      </div>
                    } @else {
                      <span class="guard-empty">Sin guardia asignado</span>
                    }
                  </div>

                  <!-- OTROS / RELEVOS / DESCANSOS -->
                  @if (p.otros.length > 0) {
                    <div class="other-shifts">
                      @for (o of p.otros; track o.role) {
                        <span class="other-chip">
                          <strong>{{ o.tipo }}:</strong> {{ o.nombre }} ({{ o.codigo || 'DR' }})
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </section>

      <div class="prog-panel__chart">
        <app-stats-mini-bars
          [title]="seriesTitle()"
          [series]="data()?.series ?? []"
          [loading]="loading()"
        />
      </div>
    </div>
  `,
  styles: `
    .prog-panel {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .prog-panel__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .prog-panel__head h2 {
      margin: 0 0 0.25rem;
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text, #0f172a);
    }
    .prog-panel__head p {
      margin: 0;
      color: var(--text-muted, #64748b);
      font-size: 0.88rem;
    }
    .head-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-primary {
      background: #1e40af;
      color: #fff;
      padding: 0.5rem 0.95rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.84rem;
    }
    .btn-primary:hover { background: #1e3a8a; }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.5rem 0.95rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.84rem;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    .prog-panel__error {
      margin: 0;
      color: #b91c1c;
      font-size: 0.9rem;
    }

    /* TODAY WIDGET */
    .today-card {
      background: var(--surface, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 1rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .today-card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .today-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .live-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      animation: pulseDot 2s infinite;
    }
    @keyframes pulseDot {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .today-title h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }
    .today-date-badge {
      background: #eff6ff;
      color: #1e40af;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: 0.35rem;
    }
    .inp-search {
      padding: 0.4rem 0.75rem;
      border-radius: 0.45rem;
      border: 1px solid #cbd5e1;
      font-size: 0.82rem;
      min-width: 220px;
    }

    .today-summary-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
    }
    .sum-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 0.85rem;
      border-radius: 0.65rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .sum-item.diurno { background: #fefce8; border-color: #fef08a; }
    .sum-item.nocturno { background: #f0fdf4; border-color: #bbf7d0; }
    .sum-item.covered { background: #eff6ff; border-color: #bfdbfe; }
    .sum-item.descansos { background: #faf5ff; border-color: #e9d5ff; }
    .sum-icon { font-size: 1.3rem; }
    .sum-item strong { display: block; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
    .sum-item span { font-size: 0.72rem; color: #64748b; font-weight: 600; }

    .today-posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.85rem;
    }
    .post-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      transition: all 0.2s;
    }
    .post-card.uncovered {
      border-color: #fecaca;
      background: #fffafa;
    }
    .post-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.4rem;
    }
    .post-code { color: #2563eb; font-size: 0.82rem; margin-right: 0.3rem; }
    .post-name { font-size: 0.86rem; color: #0f172a; }
    .badge-status {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 0.3rem;
    }
    .badge-status.ok { background: #dcfce7; color: #166534; }
    .badge-status.warn { background: #fee2e2; color: #991b1b; }

    .shifts-list { display: flex; flex-direction: column; gap: 0.45rem; }
    .shift-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      padding: 0.35rem 0.55rem;
      border-radius: 0.45rem;
    }
    .shift-tag {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 0.3rem;
      white-space: nowrap;
    }
    .tag-day { background: #fef08a; color: #854d0e; }
    .tag-night { background: #bbf7d0; color: #166534; }
    .guard-info { display: flex; flex-direction: column; }
    .guard-name { font-size: 0.8rem; color: #0f172a; line-height: 1.1; }
    .guard-sub { font-size: 0.68rem; color: #64748b; }
    .guard-empty { font-size: 0.75rem; color: #ef4444; font-style: italic; }

    .other-shifts { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.2rem; }
    .other-chip { font-size: 0.68rem; background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 0.3rem; color: #475569; }

    .empty-today {
      text-align: center;
      padding: 2rem 1rem;
      background: #f8fafc;
      border-radius: 0.75rem;
    }
    .btn-link { color: #2563eb; font-weight: 700; font-size: 0.85rem; text-decoration: none; }
    .loading-text { font-size: 0.85rem; color: #64748b; text-align: center; padding: 1.5rem; }

    .prog-panel__chart { max-width: 720px; }
  `,
})
export class ProgramacionPanel implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);

  readonly loading = signal(true);
  readonly todayLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ProgramacionOverview | null>(null);
  readonly todayData = signal<TodayCoverageResponse | null>(null);

  searchFilter = '';

  private readonly year: number;
  private readonly month: number;

  constructor() {
    const now = new Date();
    this.year = now.getFullYear();
    this.month = now.getMonth() + 1;
  }

  readonly monthLabel = computed(() => {
    const d = this.data();
    const y = d?.year ?? this.year;
    const m = d?.month ?? this.month;
    return `${String(m).padStart(2, '0')}/${y}`;
  });

  readonly seriesTitle = computed(() => {
    const series = this.data()?.series ?? [];
    const conflicts = this.data()?.kpis.conflicts ?? 0;
    if (conflicts > 0) return 'Conflictos por puesto (top)';
    if (series.length > 0) return 'Asignaciones por puesto (top)';
    return 'Carga por puesto';
  });

  readonly kpiItems = computed<StatsKpiItem[]>(() => {
    const k = this.data()?.kpis;
    return [
      {
        label: 'Puestos del mes',
        value: k?.postsInMonth ?? '—',
        hint: 'Con cuadro creado',
        link: '/programacion/matriz',
      },
      {
        label: 'Asignaciones',
        value: k?.assignedCells ?? '—',
        hint: 'Celdas con personal',
        link: '/programacion/cuadro',
      },
      {
        label: 'Conflictos',
        value: k?.conflicts ?? '—',
        hint: 'Mismo asociado en 2+ puestos',
        link: '/programacion/alertas',
        warn: (k?.conflicts ?? 0) > 0,
      },
      {
        label: 'Liquidación Recargos',
        value: 'Ver Nómina',
        hint: 'Horas y recargos calculados',
        link: '/programacion/recargos',
      },
    ];
  });

  readonly filteredTodayPosts = computed(() => {
    const data = this.todayData();
    if (!data?.posts) return [];
    const q = this.searchFilter.trim().toLowerCase();
    if (!q) return data.posts;
    return data.posts.filter((p) =>
      p.post.name.toLowerCase().includes(q) ||
      p.post.code.toLowerCase().includes(q) ||
      (p.turnoDia?.nombre && p.turnoDia.nombre.toLowerCase().includes(q)) ||
      (p.turnoNoche?.nombre && p.turnoNoche.nombre.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadOverview();
    this.loadTodayCoverage();
  }

  private loadOverview(): void {
    this.api.getMonthlyOverview(this.year, this.month).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error cargando el panel de programación');
        this.loading.set(false);
      },
    });
  }

  private loadTodayCoverage(): void {
    this.todayLoading.set(true);
    this.api.getTodayCoverage().subscribe({
      next: (res) => {
        this.todayData.set(res);
        this.todayLoading.set(false);
      },
      error: () => {
        this.todayLoading.set(false);
      },
    });
  }
}
