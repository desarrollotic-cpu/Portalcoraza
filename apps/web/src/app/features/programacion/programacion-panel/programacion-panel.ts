import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MonthlySchedulingApiService,
  PayrollAssociateRecargo,
  ProgramacionOverview,
  TodayCoverageResponse,
} from '../monthly-scheduling-api.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { StatsMiniBars } from '../../../shared/components/stats-mini-bars/stats-mini-bars';

export interface GuardAvailabilityItem {
  associateId: string;
  nombre: string;
  cedula: string;
  puestosMes: string;
  statusToday: 'TURNO_DIA' | 'TURNO_NOCHE' | 'DESCANSO' | 'NOVEDAD' | 'DISPONIBLE';
  puestoHoy: string | null;
  statusLabel: string;
  totalHorasMes: number;
}

@Component({
  selector: 'app-programacion-panel',
  imports: [FormsModule, RouterLink, StatsKpiGrid, StatsMiniBars],
  template: `
    <div class="prog-panel">
      <header class="prog-panel__head">
        <div>
          <h2>Panel de Programación y Disponibilidad Operativa</h2>
          <p>Supervisión en vivo de puestos cubiertos, vigilantes en servicio y personal disponible para relevos.</p>
        </div>
        <div class="head-actions">
          <a routerLink="/programacion/cuadro" class="btn-primary">📋 Cuadro de Turnos</a>
          <a routerLink="/programacion/recargos" class="btn-secondary">💰 Liquidación y Recargos</a>
        </div>
      </header>

      @if (error()) {
        <p class="prog-panel__error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      <!-- PESTAÑAS DE VISTA PRINCIPAL -->
      <div class="panel-tabs">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'cobertura'"
          (click)="activeTab.set('cobertura')"
        >
          📍 Cobertura de Puestos Hoy ({{ todayData()?.posts?.length || 0 }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'disponibilidad'"
          (click)="activeTab.set('disponibilidad')"
        >
          👥 Disponibilidad de Vigilantes y Relevos ({{ guardsList().length }})
        </button>
      </div>

      <!-- VISTA 1: COBERTURA DE PUESTOS HOY -->
      @if (activeTab() === 'cobertura') {
        <section class="today-card">
          <div class="today-card__head">
            <div class="today-title">
              <span class="live-dot"></span>
              <h3>📍 Turno de Hoy — Puestos de Servicio</h3>
              <span class="today-date-badge">{{ todayData()?.date || 'Hoy' }}</span>
            </div>
            <div class="today-search">
              <input
                type="text"
                placeholder="🔍 Filtrar por puesto o vigilante..."
                [ngModel]="searchFilter()"
                (ngModelChange)="searchFilter.set($event)"
                class="inp-search"
              />
            </div>
          </div>

          @if (todayLoading()) {
            <p class="loading-text">Consultando asignaciones operativas de hoy...</p>
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
              <div class="sum-item disponibles">
                <span class="sum-icon">🟢</span>
                <div>
                  <strong>{{ availableCount() }}</strong>
                  <span>Disponibles / Libres</span>
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

                    <!-- RELEVOS / DESCANSOS DEL PUESTO -->
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
      }

      <!-- VISTA 2: DISPONIBILIDAD DE PERSONAL Y RELEVOS -->
      @if (activeTab() === 'disponibilidad') {
        <section class="availability-card">
          <div class="avail-head">
            <div>
              <h3>👥 Estado y Disponibilidad de Vigilantes en Tiempo Real</h3>
              <p class="avail-sub">Identifica guardias en turno, relevos en servicio y personal disponible para cubrir novedades.</p>
            </div>
            <div class="avail-filters">
              <input
                type="text"
                placeholder="🔍 Buscar vigilante o cédula..."
                [ngModel]="guardSearchQuery()"
                (ngModelChange)="guardSearchQuery.set($event)"
                class="inp-search-guard"
              />
              <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" class="select-filter">
                <option value="ALL">Todos los Estados ({{ guardsList().length }})</option>
                <option value="DISPONIBLE">🟢 Disponibles / Libres Hoy ({{ availableCount() }})</option>
                <option value="TURNO_DIA">☀️ De Turno Diurno</option>
                <option value="TURNO_NOCHE">🌙 De Turno Nocturno</option>
                <option value="DESCANSO">🏖️ En Descanso</option>
                <option value="NOVEDAD">🏥 En Novedad Médica / Vacaciones</option>
              </select>
            </div>
          </div>

          <div class="avail-table-wrap">
            <table class="avail-table">
              <thead>
                <tr>
                  <th>Vigilante / Documento</th>
                  <th>Estado Hoy</th>
                  <th>Puesto que Cubre Hoy</th>
                  <th>Puestos Asignados en el Mes</th>
                  <th class="text-right">Horas Mes</th>
                </tr>
              </thead>
              <tbody>
                @for (g of filteredGuards(); track g.associateId) {
                  <tr>
                    <td>
                      <div class="guard-main">
                        <strong>{{ g.nombre }}</strong>
                        <span class="guard-ced">CC: {{ g.cedula }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-pill" [class]="'st-' + g.statusToday.toLowerCase()">
                        {{ g.statusLabel }}
                      </span>
                    </td>
                    <td>
                      @if (g.puestoHoy) {
                        <strong class="puesto-highlight">📍 {{ g.puestoHoy }}</strong>
                      } @else if (g.statusToday === 'DISPONIBLE') {
                        <span class="free-text">🟢 Listo para asignación de relevo</span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <div class="puestos-chips">
                        @if (g.puestosMes) {
                          <span class="puesto-chip">{{ g.puestosMes }}</span>
                        } @else {
                          <span class="text-muted">Sin programación mensual</span>
                        }
                      </div>
                    </td>
                    <td class="text-right">
                      <strong>{{ g.totalHorasMes }}h</strong>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="empty-cell">No se encontraron vigilantes con el criterio de búsqueda.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

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

    /* PESTAÑAS PRINCIPALES */
    .panel-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.25rem;
    }
    .tab-btn {
      padding: 0.65rem 1.25rem;
      border: none;
      background: none;
      font-size: 0.92rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      border-radius: 0.5rem 0.5rem 0 0;
      transition: all 0.15s;
    }
    .tab-btn:hover { color: #1e40af; background: #f8fafc; }
    .tab-btn.active {
      color: #1e40af;
      border-bottom: 3px solid #1e40af;
      background: #eff6ff;
    }

    /* TODAY WIDGET */
    .today-card, .availability-card {
      background: var(--surface, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 1rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .today-card__head, .avail-head {
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
    .today-title h3, .avail-head h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
    }
    .avail-sub { margin: 0.15rem 0 0; font-size: 0.82rem; color: #64748b; }
    .today-date-badge {
      background: #eff6ff;
      color: #1e40af;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: 0.35rem;
    }
    .inp-search, .inp-search-guard, .select-filter {
      padding: 0.45rem 0.75rem;
      border-radius: 0.45rem;
      border: 1px solid #cbd5e1;
      font-size: 0.82rem;
    }
    .inp-search { min-width: 240px; }
    .inp-search-guard { min-width: 250px; }
    .avail-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }

    .today-summary-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
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
    .sum-item.disponibles { background: #ecfdf5; border-color: #6ee7b7; }
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

    /* TABLA DE DISPONIBILIDAD */
    .avail-table-wrap {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
    }
    .avail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    .avail-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 0.65rem 0.85rem;
      font-weight: 700;
      font-size: 0.78rem;
    }
    .avail-table td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .avail-table tr:hover td {
      background: #f8fafc;
    }
    .guard-main { display: flex; flex-direction: column; }
    .guard-ced { font-size: 0.72rem; color: #64748b; }
    .status-pill {
      display: inline-block;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 800;
    }
    .st-turno_dia { background: #fef08a; color: #854d0e; }
    .st-turno_noche { background: #bbf7d0; color: #166534; }
    .st-disponible { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .st-descanso { background: #f1f5f9; color: #475569; }
    .st-novedad { background: #fee2e2; color: #991b1b; }

    .puesto-highlight { color: #1e40af; font-size: 0.84rem; }
    .free-text { color: #15803d; font-weight: 700; font-size: 0.78rem; }
    .puesto-chip {
      display: inline-block;
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      padding: 0.15rem 0.45rem;
      border-radius: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .empty-cell { text-align: center; padding: 2rem; color: #94a3b8; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; }

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

  readonly activeTab = signal<'cobertura' | 'disponibilidad'>('cobertura');
  readonly loading = signal(true);
  readonly todayLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ProgramacionOverview | null>(null);
  readonly todayData = signal<TodayCoverageResponse | null>(null);
  readonly payrollRecargos = signal<PayrollAssociateRecargo[]>([]);

  readonly searchFilter = signal('');
  readonly guardSearchQuery = signal('');
  readonly statusFilter = signal('ALL');

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
    const totalGuardias = this.guardsList().length;
    const disponibles = this.availableCount();
    const puestosTotal = this.todayData()?.summary.totalPosts ?? (k?.postsInMonth ?? 180);

    return [
      {
        label: 'Puestos Operativos',
        value: puestosTotal,
        hint: `${this.todayData()?.summary.coveredPosts ?? 0} cubiertos hoy`,
        link: '/programacion/cuadro',
      },
      {
        label: 'Vigilantes Activos',
        value: totalGuardias || (this.data()?.kpis.assignedCells ? '681' : '—'),
        hint: 'En plantilla de seguridad',
        link: '/programacion/cuadro',
      },
      {
        label: 'Disponibles / Relevos',
        value: disponibles,
        hint: 'Libres para cubrir novedades',
        link: '/programacion/panel',
      },
      {
        label: 'Conflictos de Malla',
        value: k?.conflicts ?? 0,
        hint: 'Auditoría en tiempo real',
        link: '/programacion/alertas',
        warn: (k?.conflicts ?? 0) > 0,
      },
    ];
  });

  readonly filteredTodayPosts = computed(() => {
    const data = this.todayData();
    if (!data?.posts) return [];
    const q = this.searchFilter().trim().toLowerCase();
    if (!q) return data.posts;
    return data.posts.filter((p) =>
      p.post.name.toLowerCase().includes(q) ||
      p.post.code.toLowerCase().includes(q) ||
      (p.turnoDia?.nombre && p.turnoDia.nombre.toLowerCase().includes(q)) ||
      (p.turnoNoche?.nombre && p.turnoNoche.nombre.toLowerCase().includes(q))
    );
  });

  /**
   * Construye la lista unificada de todos los vigilantes cruzando
   * las asignaciones de hoy y las programaciones mensuales.
   */
  readonly guardsList = computed<GuardAvailabilityItem[]>(() => {
    const today = this.todayData();
    const payroll = this.payrollRecargos();

    // Map of guard ID -> today shift details
    const todayAssocMap = new Map<string, { status: 'TURNO_DIA' | 'TURNO_NOCHE' | 'DESCANSO' | 'NOVEDAD'; puesto: string; label: string }>();

    if (today?.posts) {
      for (const p of today.posts) {
        if (p.turnoDia?.associateId) {
          todayAssocMap.set(p.turnoDia.associateId, {
            status: 'TURNO_DIA',
            puesto: p.post.name,
            label: '☀️ Turno Diurno (06–18)',
          });
        }
        if (p.turnoNoche?.associateId) {
          todayAssocMap.set(p.turnoNoche.associateId, {
            status: 'TURNO_NOCHE',
            puesto: p.post.name,
            label: '🌙 Turno Nocturno (18–06)',
          });
        }
        for (const o of p.otros) {
          if (o.associateId && !todayAssocMap.has(o.associateId)) {
            const code = (o.codigo || '').toUpperCase();
            if (code === 'DR' || code === 'NR') {
              todayAssocMap.set(o.associateId, {
                status: 'DESCANSO',
                puesto: p.post.name,
                label: '🏖️ En Descanso',
              });
            } else {
              todayAssocMap.set(o.associateId, {
                status: 'NOVEDAD',
                puesto: p.post.name,
                label: `🏥 Novedad (${code || 'Permiso'})`,
              });
            }
          }
        }
      }
    }

    return payroll.map((rec) => {
      const todayInfo = todayAssocMap.get(rec.associateId);
      let statusToday: 'TURNO_DIA' | 'TURNO_NOCHE' | 'DESCANSO' | 'NOVEDAD' | 'DISPONIBLE' = 'DISPONIBLE';
      let puestoHoy: string | null = null;
      let statusLabel = '🟢 DISPONIBLE / LIBRE HOY';

      if (todayInfo) {
        statusToday = todayInfo.status;
        puestoHoy = todayInfo.puesto;
        statusLabel = todayInfo.label;
      }

      return {
        associateId: rec.associateId,
        nombre: rec.nombre,
        cedula: rec.cedula,
        puestosMes: rec.puestos,
        statusToday,
        puestoHoy,
        statusLabel,
        totalHorasMes: rec.totalHoras,
      };
    });
  });

  readonly availableCount = computed(() => {
    return this.guardsList().filter((g) => g.statusToday === 'DISPONIBLE').length;
  });

  readonly filteredGuards = computed(() => {
    const list = this.guardsList();
    const q = this.guardSearchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    return list.filter((g) => {
      const matchQ = !q || g.nombre.toLowerCase().includes(q) || g.cedula.includes(q) || (g.puestoHoy && g.puestoHoy.toLowerCase().includes(q)) || g.puestosMes.toLowerCase().includes(q);
      const matchStatus = status === 'ALL' || g.statusToday === status;
      return matchQ && matchStatus;
    });
  });

  ngOnInit(): void {
    this.loadOverview();
    this.loadTodayCoverage();
    this.loadPayrollAssociates();
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

  private loadPayrollAssociates(): void {
    this.api.getPayrollRecargos(this.year, this.month).subscribe({
      next: (res) => {
        this.payrollRecargos.set(res.associates || []);
      },
    });
  }
}
