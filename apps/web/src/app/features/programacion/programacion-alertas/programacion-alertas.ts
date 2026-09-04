import { Component, OnInit, Type, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideArrowRight,
  LucideCalendarClock,
  LucideMoon,
  LucideSun,
  LucideUserX,
  LucideUsers,
} from '@lucide/angular';
import { Icon } from '../../../shared/components/icon/icon';
import {
  MonthlyAlertsResponse,
  MonthlySchedulingApiService,
  ScheduleAlertItem,
  ScheduleAlertType,
} from '../monthly-scheduling-api.service';

type TabKey = 'huecos' | 'inactivos' | 'conflictos' | 'carga';

const TAB_TYPE: Record<TabKey, ScheduleAlertType> = {
  huecos: 'hueco_cobertura',
  inactivos: 'asociado_inactivo',
  conflictos: 'conflicto_mismo_turno',
  carga: 'carga_sobre_24',
};

const PAGE_SIZE = 12;

@Component({
  selector: 'app-programacion-alertas',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <div class="alerts">
      <header class="alerts__head">
        <div>
          <h2>Qué hay que cubrir</h2>
          <p>
            De hoy en adelante. Cada tarjeta es un puesto o una persona. El botón abre el cuadro
            <strong>de ese puesto</strong>, en el día que falta.
          </p>
        </div>
        <label class="alerts__month">
          Mes
          <input type="month" [ngModel]="monthInput()" (ngModelChange)="onMonth($event)" />
        </label>
      </header>

      @if (error()) {
        <p class="alerts__error" role="alert">{{ error() }}</p>
      }

      <div class="alerts__kpis" role="tablist" aria-label="Tipo de alerta">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            class="kpi"
            role="tab"
            [class.kpi--on]="tab() === t.key"
            [class.kpi--hot]="count(t.key) > 0 && t.key !== 'carga'"
            [class.kpi--warn]="t.key === 'carga' && count(t.key) > 0"
            [attr.aria-selected]="tab() === t.key"
            (click)="selectTab(t.key)"
          >
            <span class="kpi__icon" aria-hidden="true">
              <app-icon [icon]="t.icon" [size]="20" />
            </span>
            <span class="kpi__label">{{ t.label }}</span>
            <strong class="kpi__value">{{ loading() ? '—' : count(t.key) }}</strong>
            <span class="kpi__hint">{{ kpiHint(t.key) }}</span>
          </button>
        }
      </div>

      <p class="alerts__now" [attr.aria-live]="'polite'">
        @switch (tab()) {
          @case ('huecos') {
            Puestos donde falta vigilante de día o de noche.
          }
          @case ('inactivos') {
            Alguien ya programado que quedó inactivo, de vacaciones o en incapacidad.
          }
          @case ('conflictos') {
            La misma persona en dos puestos el mismo día y el mismo horario.
          }
          @default {
            Personas con más de 24 turnos de 12 horas en el mes.
          }
        }
      </p>

      @if (loading()) {
        <div class="skel" aria-busy="true" aria-label="Cargando alertas">
          <div class="skel__card"></div>
          <div class="skel__card"></div>
          <div class="skel__card"></div>
        </div>
      } @else if (tab() === 'huecos' && huecoGroups().length === 0) {
        <div class="empty">
          <p>No hay puestos descubiertos de hoy en adelante.</p>
          <a routerLink="/programacion/cuadro">Ir al cuadro mensual</a>
        </div>
      } @else if (tab() !== 'huecos' && filtered().length === 0) {
        <div class="empty">
          <p>Nada en esta lista por ahora.</p>
        </div>
      } @else {
        @if (totalPages() > 1) {
          <div class="alerts__pager">
            <button type="button" [disabled]="page() <= 1" (click)="goPage(page() - 1)">Anterior</button>
            <span>{{ rangeLabel() }}</span>
            <button type="button" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">Siguiente</button>
          </div>
        }

        @if (tab() === 'huecos') {
          <ul class="cards">
            @for (g of pageGroups(); track g.postId + g.month) {
              <li class="card">
                <div class="card__top">
                  <h3>{{ g.postName }}</h3>
                  <span class="badge">Sin cubrir</span>
                </div>
                <p class="card__lead">
                  Este puesto no tiene quien trabaje
                  @if (g.daysD.length && g.daysN.length) {
                    de <strong>día</strong> ni de <strong>noche</strong>
                  } @else if (g.daysD.length) {
                    de <strong>día</strong>
                  } @else {
                    de <strong>noche</strong>
                  }
                  {{ daySpan(g.daysD.length ? g.daysD : g.daysN) }}.
                </p>
                <div class="stats">
                  <div class="stat">
                    <app-icon [icon]="icons.Sun" [size]="16" />
                    <span>Día (D)</span>
                    <strong>{{ g.daysD.length }}</strong>
                    <em>turnos vacíos</em>
                  </div>
                  <div class="stat">
                    <app-icon [icon]="icons.Moon" [size]="16" />
                    <span>Noche (N)</span>
                    <strong>{{ g.daysN.length }}</strong>
                    <em>turnos vacíos</em>
                  </div>
                </div>
                <details class="more">
                  <summary>Ver los días</summary>
                  @if (g.daysD.length) {
                    <p>Día: {{ daySpan(g.daysD) }}</p>
                  }
                  @if (g.daysN.length) {
                    <p>Noche: {{ daySpan(g.daysN) }}</p>
                  }
                </details>
                <a
                  class="cta"
                  [routerLink]="['/programacion/cuadro']"
                  [queryParams]="{ postId: g.postId, month: g.month, day: g.firstDay }"
                >
                  Programar {{ g.postName }}
                  <app-icon [icon]="icons.Arrow" [size]="16" />
                </a>
              </li>
            }
          </ul>
        } @else {
          <ul class="cards">
            @for (a of pageItems(); track a.id) {
              <li class="card" [class.card--warn]="a.severity === 'warning'">
                <div class="card__top">
                  <h3>{{ personTitle(a) }}</h3>
                  <span class="badge" [class.badge--warn]="a.severity === 'warning'">{{ kindLabel(a.type) }}</span>
                </div>
                <p class="card__lead">{{ a.message }}</p>
                <dl class="facts">
                  @if (a.postName) {
                    <div><dt>Puesto</dt><dd>{{ a.postName }}</dd></div>
                  }
                  @if (a.day) {
                    <div><dt>Día</dt><dd>{{ a.day }}</dd></div>
                  }
                  @if (a.shift) {
                    <div><dt>Turno</dt><dd>{{ a.shift === 'D' ? 'Día (D)' : 'Noche (N)' }}</dd></div>
                  }
                  @if (a.documentNumber) {
                    <div><dt>Cédula</dt><dd>{{ a.documentNumber }}</dd></div>
                  }
                  @if (a.otherPostName) {
                    <div><dt>También en</dt><dd>{{ a.otherPostName }}</dd></div>
                  }
                  @if (a.reason) {
                    <div><dt>Motivo</dt><dd>{{ a.reason }}</dd></div>
                  }
                </dl>
                @if (a.suggestedAction) {
                  <p class="do">{{ a.suggestedAction }}</p>
                }
                <a
                  class="cta"
                  [routerLink]="['/programacion/cuadro']"
                  [queryParams]="{ postId: a.postId, month: a.month, day: a.day || undefined }"
                >
                  Abrir {{ a.postName || 'el cuadro' }}
                  <app-icon [icon]="icons.Arrow" [size]="16" />
                </a>
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: `
    .alerts { display: flex; flex-direction: column; gap: 1rem; max-width: 72rem; }
    .alerts__head {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: end;
    }
    .alerts__head h2 {
      margin: 0 0 0.35rem; font-size: 1.35rem; letter-spacing: -0.02em; text-wrap: balance;
    }
    .alerts__head p {
      margin: 0; max-width: 42rem; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;
    }
    .alerts__month { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; font-weight: 600; }
    .alerts__month input {
      min-height: 44px; padding: 0.45rem 0.7rem; border: 1px solid var(--coraza-border);
      border-radius: 10px; background: var(--coraza-surface); color: inherit; font: inherit;
    }
    .alerts__error { margin: 0; color: var(--coraza-error, #b91c1c); font-weight: 600; }
    .alerts__kpis {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem;
    }
    @media (min-width: 900px) {
      .alerts__kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    .kpi {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem;
      min-height: 44px; text-align: left; cursor: pointer;
      padding: 0.85rem 1rem; border-radius: 14px;
      border: 1px solid var(--coraza-border);
      background: var(--coraza-surface); color: inherit; font: inherit;
      transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }
    .kpi:focus-visible { outline: 3px solid var(--coraza-primary, #1d4ed8); outline-offset: 2px; }
    .kpi:hover { border-color: var(--coraza-primary, #1d4ed8); }
    .kpi--on {
      border-color: var(--coraza-primary, #1d4ed8);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--coraza-primary, #1d4ed8) 22%, transparent);
    }
    .kpi--hot .kpi__value { color: #b91c1c; }
    .kpi--warn .kpi__value { color: #b45309; }
    .kpi__icon { color: var(--text-secondary); }
    .kpi__label { font-size: 0.8rem; font-weight: 700; }
    .kpi__value { font-size: 1.6rem; line-height: 1.1; }
    .kpi__hint { font-size: 0.75rem; color: var(--text-muted, var(--text-secondary)); line-height: 1.35; }
    .alerts__now { margin: 0; font-size: 0.92rem; color: var(--text-secondary); }
    .skel { display: grid; gap: 0.75rem; }
    .skel__card {
      height: 10rem; border-radius: 14px; background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
    }
    .empty {
      padding: 1.5rem; border: 1px dashed var(--coraza-border); border-radius: 14px;
      background: var(--coraza-surface);
    }
    .empty p { margin: 0 0 0.75rem; }
    .empty a { color: var(--coraza-primary, #1d4ed8); font-weight: 600; }
    .alerts__pager {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;
      font-size: 0.85rem; color: var(--text-muted, var(--text-secondary));
    }
    .alerts__pager button {
      min-height: 44px; min-width: 44px; padding: 0.4rem 0.9rem; cursor: pointer; font: inherit;
      border: 1px solid var(--coraza-border); background: var(--coraza-surface); border-radius: 10px;
    }
    .alerts__pager button:disabled { opacity: 0.45; cursor: not-allowed; }
    .alerts__pager button:focus-visible { outline: 3px solid var(--coraza-primary, #1d4ed8); outline-offset: 2px; }
    .cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.85rem; }
    @media (min-width: 900px) {
      .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .card {
      display: flex; flex-direction: column; gap: 0.7rem;
      padding: 1rem 1.1rem; border-radius: 14px;
      border: 1px solid var(--coraza-border);
      border-left: 4px solid #b91c1c;
      background: var(--coraza-surface);
    }
    .card--warn { border-left-color: #b45309; }
    .card__top { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; }
    .card h3 { margin: 0; font-size: 1.15rem; }
    .badge {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase;
      padding: 0.2rem 0.55rem; border-radius: 999px; background: #fee2e2; color: #991b1b;
    }
    .badge--warn { background: #fef3c7; color: #92400e; }
    .card__lead { margin: 0; line-height: 1.45; font-size: 0.95rem; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .stat {
      display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto auto;
      column-gap: 0.4rem; padding: 0.55rem 0.65rem; border-radius: 10px;
      background: var(--bg-page, #f8fafc); border: 1px solid var(--coraza-border);
      font-size: 0.8rem;
    }
    .stat app-icon { grid-row: 1 / span 3; align-self: center; }
    .stat strong { font-size: 1.25rem; }
    .stat em { font-style: normal; color: var(--text-muted, var(--text-secondary)); }
    .more { font-size: 0.85rem; color: var(--text-secondary); }
    .more summary { cursor: pointer; font-weight: 600; min-height: 32px; }
    .more p { margin: 0.35rem 0 0; }
    .facts {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.4rem 0.75rem;
      margin: 0; font-size: 0.85rem;
    }
    .facts dt { color: var(--text-muted, var(--text-secondary)); font-weight: 600; }
    .facts dd { margin: 0; }
    .do { margin: 0; font-size: 0.88rem; font-weight: 600; }
    .cta {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
      min-height: 44px; margin-top: auto; padding: 0.55rem 0.9rem; border-radius: 10px;
      background: var(--coraza-primary, #1d4ed8); color: #fff; font-weight: 700; text-decoration: none;
      transition: filter 180ms ease;
    }
    .cta:hover { filter: brightness(1.06); }
    .cta:focus-visible { outline: 3px solid var(--coraza-primary, #1d4ed8); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) {
      .kpi, .cta { transition: none; }
    }
  `,
})
export class ProgramacionAlertas implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);

  readonly icons = {
    Sun: LucideSun,
    Moon: LucideMoon,
    Arrow: LucideArrowRight,
  };

  readonly tabs: Array<{ key: TabKey; label: string; hint: string; icon: Type<unknown> }> = [
    {
      key: 'huecos',
      label: 'Puestos vacíos',
      hint: 'Falta día o noche',
      icon: LucideAlertTriangle,
    },
    {
      key: 'inactivos',
      label: 'No disponibles',
      hint: 'Inactivo o incapacidad',
      icon: LucideUserX,
    },
    {
      key: 'conflictos',
      label: 'Doble puesto',
      hint: 'Misma hora, dos sitios',
      icon: LucideUsers,
    },
    {
      key: 'carga',
      label: 'Carga alta',
      hint: 'Más de 24 turnos 12 h',
      icon: LucideCalendarClock,
    },
  ];

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<MonthlyAlertsResponse | null>(null);
  readonly tab = signal<TabKey>('huecos');
  readonly page = signal(1);
  readonly monthInput = signal('');

  private year = new Date().getFullYear();
  private month = new Date().getMonth() + 1;

  readonly filtered = computed(() => {
    const type = TAB_TYPE[this.tab()];
    return (this.data()?.alerts ?? []).filter((a) => a.type === type);
  });

  readonly huecoGroups = computed(() => this.data()?.huecoGroups ?? []);

  readonly listLength = computed(() =>
    this.tab() === 'huecos' ? this.huecoGroups().length : this.filtered().length,
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.listLength() / PAGE_SIZE)),
  );

  readonly pageItems = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  readonly pageGroups = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.huecoGroups().slice(start, start + PAGE_SIZE);
  });

  readonly rangeLabel = computed(() => {
    const total = this.listLength();
    if (!total) return '0';
    const from = (this.page() - 1) * PAGE_SIZE + 1;
    const to = Math.min(this.page() * PAGE_SIZE, total);
    return `${from}–${to} de ${total}`;
  });

  ngOnInit(): void {
    this.api.getActivePeriod().subscribe({
      next: (p) => {
        this.year = p.year;
        this.month = p.month;
        this.monthInput.set(`${p.year}-${String(p.month).padStart(2, '0')}`);
        this.reload();
      },
      error: () => {
        this.monthInput.set(`${this.year}-${String(this.month).padStart(2, '0')}`);
        this.reload();
      },
    });
  }

  count(key: TabKey): number {
    const t = this.data()?.totals;
    if (!t) return 0;
    if (key === 'huecos') return this.huecoGroups().length || t.huecos;
    if (key === 'inactivos') return t.inactivos;
    if (key === 'conflictos') return t.conflictos;
    return t.carga;
  }

  kpiHint(key: TabKey): string {
    const t = this.data()?.totals;
    if (key === 'huecos') {
      const n = t?.huecos ?? 0;
      return n ? `${n} turnos sin gente` : 'Falta día o noche';
    }
    const tab = this.tabs.find((x) => x.key === key);
    return tab?.hint ?? '';
  }

  kindLabel(type: ScheduleAlertType): string {
    if (type === 'hueco_cobertura') return 'Puesto vacío';
    if (type === 'asociado_inactivo') return 'No disponible';
    if (type === 'conflicto_mismo_turno') return 'Doble puesto';
    return 'Carga alta';
  }

  personTitle(a: ScheduleAlertItem): string {
    return a.associateName?.trim() || a.postName || 'Alerta';
  }

  daySpan(days: number[]): string {
    if (!days.length) return '';
    const s = [...days].sort((a, b) => a - b);
    const consecutive = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
    if (consecutive) {
      return s.length === 1 ? `el día ${s[0]}` : `del ${s[0]} al ${s[s.length - 1]}`;
    }
    if (s.length <= 10) return `(${s.join(', ')})`;
    return `(${s.slice(0, 8).join(', ')}…)`;
  }

  selectTab(key: TabKey): void {
    this.tab.set(key);
    this.page.set(1);
  }

  goPage(next: number): void {
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
  }

  onMonth(value: string): void {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return;
    const [y, m] = value.split('-').map(Number);
    this.year = y;
    this.month = m;
    this.monthInput.set(value);
    this.page.set(1);
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAlerts(this.year, this.month, 'auto').subscribe({
      next: (res) => {
        this.data.set(res);
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las alertas.');
        this.loading.set(false);
      },
    });
  }
}
