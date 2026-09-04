import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  HuecoGroup,
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

const PAGE_SIZE = 25;

@Component({
  selector: 'app-programacion-alertas',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="alerts">
      <header class="alerts__head">
        <div>
          <h2>Alertas de programación</h2>
          <p>Solo días de hoy en adelante. Huecos agrupados por puesto. Clic abre el cuadro en el primer día con problema.</p>
        </div>
        <label class="alerts__month">
          Mes
          <input type="month" [ngModel]="monthInput()" (ngModelChange)="onMonth($event)" />
        </label>
      </header>

      @if (error()) {
        <p class="alerts__error">{{ error() }}</p>
      }

      <div class="alerts__totals">
        <span>Huecos: {{ data()?.totals?.huecos ?? '—' }}@if (huecoGroups().length) { · {{ huecoGroups().length }} puestos }</span>
        <span>Inactivos: {{ data()?.totals?.inactivos ?? '—' }}</span>
        <span>Conflictos: {{ data()?.totals?.conflictos ?? '—' }}</span>
        <span>Carga: {{ data()?.totals?.carga ?? '—' }}</span>
      </div>

      <div class="alerts__tabs" role="tablist">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            role="tab"
            [class.active]="tab() === t.key"
            (click)="selectTab(t.key)"
          >
            {{ t.label }} ({{ count(t.key) }})
          </button>
        }
      </div>

      @if (loading()) {
        <p class="alerts__muted">Cargando…</p>
      } @else if (tab() === 'huecos' && huecoGroups().length === 0) {
        <p class="alerts__muted">Sin huecos pendientes de hoy en adelante.</p>
      } @else if (tab() !== 'huecos' && filtered().length === 0) {
        <p class="alerts__muted">Sin alertas en esta pestaña.</p>
      } @else {
        <div class="alerts__pager">
          <button type="button" [disabled]="page() <= 1" (click)="goPage(page() - 1)">Anterior</button>
          <span>{{ rangeLabel() }} · Página {{ page() }} de {{ totalPages() }}</span>
          <button type="button" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">Siguiente</button>
        </div>
        @if (tab() === 'huecos') {
          <ul class="alerts__list">
            @for (g of pageGroups(); track g.postId + g.month) {
              <li class="sev-error">
                <button type="button" class="alerts__item" (click)="openHueco(g)">
                  <span class="kind">Hueco de cobertura</span>
                  <span class="msg">{{ g.postName }} · {{ g.count }} huecos ({{ g.daysD.length }} diurnos, {{ g.daysN.length }} nocturnos)</span>
                  <span class="meta">{{ g.month }}</span>
                  @if (g.daysD.length) {
                    <span class="days">Diurnos sin cubrir: {{ formatDays(g.daysD) }}</span>
                  }
                  @if (g.daysN.length) {
                    <span class="days">Nocturnos sin cubrir: {{ formatDays(g.daysN) }}</span>
                  }
                  <span class="action">Qué hacer: {{ g.suggestedAction }}</span>
                  <span class="go">Abrir cuadro en el día {{ g.firstDay }} →</span>
                </button>
              </li>
            }
          </ul>
        } @else {
          <ul class="alerts__list">
            @for (a of pageItems(); track a.id) {
              <li [class.sev-error]="a.severity === 'error'" [class.sev-warn]="a.severity === 'warning'">
                <button type="button" class="alerts__item" (click)="openBoard(a)">
                  <span class="kind">{{ kindLabel(a.type) }}</span>
                  <span class="msg">{{ a.message }}</span>
                  <span class="meta">
                    {{ a.month }}
                    @if (a.day) { · día {{ a.day }} }
                    @if (a.postName) { · {{ a.postName }} }
                    @if (a.shift) { · turno {{ a.shift === 'D' ? 'diurno (D)' : 'nocturno (N)' }} }
                    @if (a.associateName) { · {{ a.associateName }} }
                    @if (a.documentNumber) { · CC {{ a.documentNumber }} }
                    @if (a.otherPostName) { · también en {{ a.otherPostName }} }
                  </span>
                  @if (a.reason) {
                    <span class="reason">Motivo: {{ a.reason }}</span>
                  }
                  @if (a.suggestedAction) {
                    <span class="action">Qué hacer: {{ a.suggestedAction }}</span>
                  }
                  <span class="go">Abrir cuadro de este puesto →</span>
                </button>
              </li>
            }
          </ul>
        }
        @if (totalPages() > 1) {
          <div class="alerts__pager">
            <button type="button" [disabled]="page() <= 1" (click)="goPage(page() - 1)">Anterior</button>
            <span>Página {{ page() }} de {{ totalPages() }}</span>
            <button type="button" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">Siguiente</button>
          </div>
        }
      }

      <p class="alerts__foot">
        <a routerLink="/programacion/cuadro">Ir al cuadro mensual</a>
      </p>
    </div>
  `,
  styles: `
    .alerts { display: flex; flex-direction: column; gap: 1rem; }
    .alerts__head {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; align-items: end;
    }
    .alerts__head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .alerts__head p { margin: 0; color: var(--text-muted, var(--text-secondary)); font-size: 0.9rem; }
    .alerts__month { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    .alerts__month input {
      padding: 0.4rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px;
      background: var(--coraza-surface); color: inherit;
    }
    .alerts__error { margin: 0; color: var(--coraza-error, #b91c1c); }
    .alerts__totals {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; font-size: 0.9rem;
      padding: 0.75rem 1rem; border: 1px solid var(--coraza-border); border-radius: 12px;
      background: var(--coraza-surface);
    }
    .alerts__tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .alerts__tabs button {
      border: 1px solid var(--coraza-border); background: var(--coraza-surface);
      border-radius: 999px; padding: 0.35rem 0.85rem; cursor: pointer; font-size: 0.85rem;
    }
    .alerts__tabs button.active {
      border-color: var(--coraza-primary, #1d4ed8); color: var(--coraza-primary, #1d4ed8);
      font-weight: 600;
    }
    .alerts__muted { margin: 0; color: var(--text-muted); }
    .alerts__pager {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;
      font-size: 0.85rem; color: var(--text-muted, var(--text-secondary));
    }
    .alerts__pager button {
      border: 1px solid var(--coraza-border); background: var(--coraza-surface);
      border-radius: 8px; padding: 0.35rem 0.75rem; cursor: pointer; font: inherit;
    }
    .alerts__pager button:disabled { opacity: 0.45; cursor: not-allowed; }
    .alerts__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .alerts__item {
      width: 100%; text-align: left; cursor: pointer;
      border: 1px solid var(--coraza-border); border-radius: 10px;
      background: var(--coraza-surface); padding: 0.75rem 1rem;
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .sev-error .alerts__item { border-left: 4px solid #b91c1c; }
    .sev-warn .alerts__item { border-left: 4px solid #b45309; }
    .msg { font-size: 0.92rem; }
    .kind {
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--coraza-primary, #1d4ed8);
    }
    .meta { font-size: 0.8rem; color: var(--text-muted); }
    .reason, .action { font-size: 0.82rem; color: var(--text-secondary, #334155); }
    .action { font-weight: 600; }
    .days { font-size: 0.82rem; color: var(--text-secondary, #334155); }
    .go { font-size: 0.78rem; color: var(--coraza-primary, #1d4ed8); }
    .alerts__foot { font-size: 0.85rem; }
    .alerts__foot a { color: var(--coraza-primary, #1d4ed8); }
  `,
})
export class ProgramacionAlertas implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);
  private readonly router = inject(Router);

  readonly tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'huecos', label: 'Huecos' },
    { key: 'inactivos', label: 'Inactivos' },
    { key: 'conflictos', label: 'Conflictos' },
    { key: 'carga', label: 'Carga' },
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
    if (key === 'huecos') return t.huecos;
    if (key === 'inactivos') return t.inactivos;
    if (key === 'conflictos') return t.conflictos;
    return t.carga;
  }

  kindLabel(type: ScheduleAlertType): string {
    if (type === 'hueco_cobertura') return 'Hueco de cobertura';
    if (type === 'asociado_inactivo') return 'Vigilante no disponible';
    if (type === 'conflicto_mismo_turno') return 'Doble puesto mismo horario';
    return 'Carga de turnos';
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

  openBoard(a: ScheduleAlertItem): void {
    void this.router.navigate(['/programacion/cuadro'], {
      queryParams: {
        postId: a.postId || undefined,
        month: a.month,
        day: a.day || undefined,
      },
    });
  }

  openHueco(g: HuecoGroup): void {
    void this.router.navigate(['/programacion/cuadro'], {
      queryParams: { postId: g.postId, month: g.month, day: g.firstDay },
    });
  }

  formatDays(days: number[]): string {
    if (days.length <= 12) return days.join(', ');
    return `${days.slice(0, 12).join(', ')}…`;
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
