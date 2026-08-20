import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MonthlyScheduleWithPost,
  MonthlySchedulingApiService,
  ScheduleConflict,
} from '../monthly-scheduling-api.service';
import { SchedulingApiService } from '../scheduling-api.service';
import { getColombiaHolidays, isColombiaHoliday } from '../utils/colombia-holidays';

@Component({
  selector: 'app-master-grid',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Matriz multi-puesto</h2>
          <p>Vista del mes completo: filas = puestos, columnas = días. Clic en un puesto para editar el cuadro.</p>
        </div>
        <div class="controls">
          <label>
            Mes
            <input type="month" [(ngModel)]="month" (ngModelChange)="reload()" />
          </label>
          <label>
            Tipo de puesto
            <select [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
              <option value="">Todos</option>
              @for (t of postTypes(); track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </label>
          <label>
            Ciclo global
            <select [(ngModel)]="tipoCiclo">
              <option value="12x3">12×3</option>
              <option value="10x5">10×5</option>
              <option value="2x2">2×2</option>
              <option value="13x2">13×2</option>
            </select>
          </label>
          <button
            type="button"
            class="primary"
            (click)="runMotorGlobal(false)"
            [disabled]="busy()"
            title="Aplica el motor a todos los cuadros del mes"
          >
            Motor global
          </button>
          <button
            type="button"
            class="ghost"
            (click)="runMotorGlobal(true)"
            [disabled]="busy()"
            title="Crea cuadros faltantes de puestos activos y aplica el motor"
          >
            Crear faltantes + motor
          </button>
          <button type="button" class="ghost" (click)="reload()" [disabled]="busy()">
            Actualizar
          </button>
        </div>
      </header>

      @if (globalMsg()) {
        <div class="banner ok">{{ globalMsg() }}</div>
      }

      @if (conflicts().length) {
        <div class="banner warn">
          <strong>{{ conflicts().length }} conflicto(s)</strong>
          — mismo asociado en D/N en más de un puesto el mismo día.
          <a routerLink="/programacion/alertas">Ver alertas</a>
        </div>
      }

      @if (loading()) {
        <p>Cargando matriz…</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (!filteredRows().length) {
        <p class="empty">
          No hay programaciones para {{ month }}.
          Crea cuadros desde
          <a routerLink="/programacion/cuadro">Cuadro mensual</a>.
        </p>
      } @else {
        <div class="matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="sticky-col">Puesto</th>
                @for (d of days(); track d) {
                  <th
                    [class.weekend]="isWeekend(d)"
                    [class.holiday]="holidayName(d)"
                    [title]="holidayName(d) || ''"
                  >
                    {{ d }}
                  </th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of filteredRows(); track row.postId) {
                <tr>
                  <td class="sticky-col">
                    <a [routerLink]="['/programacion/cuadro']" [queryParams]="{ postId: row.postId, month: month }">
                      <strong>{{ row.postName }}</strong>
                    </a>
                    <div class="meta">
                      {{ row.postCode }}
                      @if (row.postType) {
                        · {{ row.postType }}
                      }
                      <span class="st" [class]="'st-' + row.status">{{ row.status }}</span>
                    </div>
                  </td>
                  @for (d of days(); track d) {
                    <td
                      class="cell"
                      [class.weekend]="isWeekend(d)"
                      [class.holiday]="holidayName(d)"
                      [class]="cellClass(row, d)"
                      [title]="cellTitle(row, d)"
                    >
                      {{ cellLabel(row, d) }}
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="legend">
          <span class="badge c-d">D</span>
          <span class="badge c-n">N</span>
          <span class="badge c-d8">D8</span>
          <span class="badge c-n8">N8</span>
          <span class="badge c-dr">DR</span>
          <span class="badge c-nr">NR</span>
          <span class="badge c-mix">MIX</span>
          <span class="hint">Festivos CO resaltados · fin de semana atenuado</span>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head {
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; align-items: end;
    }
    .head h2 { margin: 0 0 0.25rem; color: var(--primary-dark); font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; max-width: 42rem; }
    .controls { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: end; }
    label {
      display: flex; flex-direction: column; gap: 0.25rem;
      font-size: 0.8rem; color: var(--text-secondary);
    }
    input, select {
      padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border);
      border-radius: 8px; font: inherit; min-width: 10rem;
    }
    .ghost {
      border-radius: 999px; border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
      background: color-mix(in srgb, var(--primary) 8%, var(--surface));
      color: var(--primary-dark); font-weight: 600; cursor: pointer;
      padding: 0.45rem 0.85rem; font-size: 0.82rem;
    }
    .ghost:disabled { opacity: 0.6; cursor: not-allowed; }
    .banner.warn {
      padding: 0.75rem 1rem; border-radius: 10px;
      background: #fff8e6; border: 1px solid #f0d78c; color: #7a5b00; font-size: 0.88rem;
    }
    .banner.ok {
      padding: 0.75rem 1rem; border-radius: 10px;
      background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 0.88rem;
    }
    .primary {
      border-radius: 999px; border: none;
      background: var(--primary-dark); color: #fff; font-weight: 600;
      cursor: pointer; padding: 0.45rem 0.85rem; font-size: 0.82rem;
    }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .matrix-wrap {
      overflow: auto; max-height: 70vh;
      border: 1px solid var(--coraza-border); border-radius: 12px;
      background: var(--coraza-surface);
    }
    .matrix { border-collapse: collapse; font-size: 0.72rem; min-width: 100%; }
    th, td {
      border: 1px solid var(--coraza-border); padding: 0.3rem 0.25rem;
      text-align: center; min-width: 28px;
    }
    th { background: var(--primary-50); position: sticky; top: 0; z-index: 2; font-weight: 700; }
    th.holiday, td.holiday { background: #fff3cd; }
    th.weekend, td.weekend { background: #f8fafc; }
    .sticky-col {
      position: sticky; left: 0; z-index: 3; text-align: left;
      min-width: 200px; max-width: 260px; background: var(--coraza-surface); padding: 0.45rem 0.65rem;
    }
    thead .sticky-col { z-index: 4; background: var(--primary-50); }
    .meta { margin-top: 0.15rem; font-size: 0.7rem; color: var(--text-secondary); }
    .st {
      display: inline-block; margin-left: 0.35rem; padding: 0.05rem 0.35rem;
      border-radius: 999px; font-size: 0.65rem; text-transform: uppercase; font-weight: 700;
    }
    .st-borrador { background: #e2e8f0; color: #334155; }
    .st-publicado { background: #dcfce7; color: #166534; }
    .st-anulado { background: #fee2e2; color: #991b1b; }
    .cell { font-weight: 700; }
    .c-d { background: #d1e7dd; color: #0f5132; }
    .c-n { background: #cfe2ff; color: #084298; }
    .c-d8 { background: #b7e4c7; color: #1b4332; }
    .c-n8 { background: #9ec5fe; color: #052c65; }
    .c-dr { background: #e9ecef; color: #495057; }
    .c-nr { background: #ced4da; color: #212529; }
    .c-mix { background: #f3e8ff; color: #6b21a8; }
    .c-empty { color: #94a3b8; }
    .legend { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
    .badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; }
    .hint { color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem; }
    .error { color: var(--coraza-error); }
    .empty { color: var(--text-secondary); }
    a { color: var(--primary-dark); text-decoration: none; }
    a:hover { text-decoration: underline; }
  `,
})
export class MasterGrid implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);
  private readonly postsApi = inject(SchedulingApiService);

  month = this.currentMonth();
  tipoCiclo: '12x3' | '10x5' | '2x2' | '13x2' = '12x3';
  typeFilter = signal('');

  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly globalMsg = signal<string | null>(null);
  readonly schedules = signal<MonthlyScheduleWithPost[]>([]);
  readonly conflicts = signal<ScheduleConflict[]>([]);
  readonly allPosts = signal<{ id: string; name: string; type?: string }[]>([]);

  readonly yearMonth = computed(() => {
    const [y, m] = this.month.split('-').map(Number);
    return { year: y, month: m };
  });

  readonly holidays = computed(() => getColombiaHolidays(this.yearMonth().year));

  readonly days = computed(() => {
    const { year, month } = this.yearMonth();
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  readonly postTypes = computed(() => {
    const set = new Set<string>();
    for (const s of this.schedules()) {
      if (s.post?.type) set.add(s.post.type);
    }
    for (const p of this.allPosts()) {
      if (p.type) set.add(p.type);
    }
    return [...set].sort();
  });

  readonly rows = computed(() => {
    return this.schedules().map((s) => {
      const byDay = new Map<number, string[]>();
      for (const a of s.assignments ?? []) {
        if (!a.codigo || a.jornada === 'sin_asignar') continue;
        const list = byDay.get(a.day) ?? [];
        list.push(a.codigo);
        byDay.set(a.day, list);
      }
      return {
        postId: s.postId,
        postName: s.post?.name ?? s.postId.slice(0, 8),
        postCode: s.post?.code ?? '',
        postType: s.post?.type ?? '',
        status: s.status,
        byDay,
      };
    });
  });

  readonly filteredRows = computed(() => {
    const t = this.typeFilter();
    if (!t) return this.rows();
    return this.rows().filter((r) => r.postType === t);
  });

  ngOnInit(): void {
    this.postsApi.listPosts().subscribe({
      next: (posts) => this.allPosts.set(posts),
    });
    this.reload();
  }

  reload(): void {
    const { year, month } = this.yearMonth();
    if (!year || !month) return;
    this.loading.set(true);
    this.error.set(null);
    this.globalMsg.set(null);

    this.api.listByMonth(year, month).subscribe({
      next: (rows) => {
        this.schedules.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la matriz del mes');
      },
    });

    this.api.findConflicts(year, month).subscribe({
      next: (c) => this.conflicts.set(c),
      error: () => this.conflicts.set([]),
    });
  }

  runMotorGlobal(createMissing: boolean): void {
    const { year, month } = this.yearMonth();
    const msg = createMissing
      ? `¿Crear cuadros faltantes de puestos activos y aplicar ciclo ${this.tipoCiclo} a todo el mes?`
      : `¿Aplicar ciclo ${this.tipoCiclo} a todos los cuadros de ${this.month}?`;
    if (!confirm(msg)) return;

    this.busy.set(true);
    this.globalMsg.set(null);
    this.api
      .generateMotorGlobal({
        year,
        month,
        tipoCiclo: this.tipoCiclo,
        createMissing,
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.globalMsg.set(
            `Motor global ${r.tipoCiclo}: ${r.ok}/${r.processed} OK` +
              (r.failed ? `, ${r.failed} con error` : ''),
          );
          this.reload();
        },
        error: () => {
          this.busy.set(false);
          this.error.set('No se pudo ejecutar el motor global');
        },
      });
  }

  isWeekend(day: number): boolean {
    const { year, month } = this.yearMonth();
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  }

  holidayName(day: number): string | null {
    const { year, month } = this.yearMonth();
    return isColombiaHoliday(year, month, day, this.holidays())?.name ?? null;
  }

  cellCodes(
    row: { byDay: Map<number, string[]> },
    day: number,
  ): string[] {
    return row.byDay.get(day) ?? [];
  }

  cellLabel(row: { byDay: Map<number, string[]> }, day: number): string {
    const codes = [...new Set(this.cellCodes(row, day))];
    if (!codes.length) return '·';
    if (codes.length === 1) return codes[0];
    const hasDay = codes.some((c) => c === 'D' || c === 'D8');
    const hasNight = codes.some((c) => c === 'N' || c === 'N8');
    if (hasDay && hasNight) return 'D/N';
    return 'MIX';
  }

  cellClass(row: { byDay: Map<number, string[]> }, day: number): string {
    const label = this.cellLabel(row, day);
    if (label === '·') return 'c-empty';
    if (label === 'D') return 'c-d';
    if (label === 'N') return 'c-n';
    if (label === 'D8') return 'c-d8';
    if (label === 'N8') return 'c-n8';
    if (label === 'DR' || label === 'R') return 'c-dr';
    if (label === 'NR') return 'c-nr';
    if (label === 'D/N' || label === 'MIX') return 'c-mix';
    return 'c-d';
  }

  cellTitle(row: { byDay: Map<number, string[]> }, day: number): string {
    const codes = this.cellCodes(row, day);
    const hol = this.holidayName(day);
    const base = codes.length ? codes.join(', ') : 'Sin asignación';
    return hol ? `${base} · ${hol}` : base;
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
