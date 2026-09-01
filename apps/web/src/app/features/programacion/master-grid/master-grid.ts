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
                    [class.col-sunday]="isSunday(d)"
                    [class.col-saturday]="isSaturday(d)"
                    [class.col-holiday]="isHoliday(d)"
                    [title]="dayTooltip(d)"
                  >
                    <div class="day-dow">{{ dayOfWeekLetter(d) }}</div>
                    <div class="day-num">{{ d }}</div>
                    @if (isHoliday(d)) {
                      <span class="hol-star" [title]="holidayName(d)"></span>
                    }
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
                      [class.col-sunday]="isSunday(d)"
                      [class.col-saturday]="isSaturday(d)"
                      [class.col-holiday]="isHoliday(d)"
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

        <div class="calendar-indicators">
          <span class="ind-pill ind-sun">
            <span class="ind-box sun-bg">D / </span>
            <strong>Domingos y Festivos de Colombia</strong>
          </span>
          <span class="ind-pill ind-sat">
            <span class="ind-box sat-bg">S</span>
            <strong>Sábados</strong>
          </span>
          <span class="ind-pill ind-week">
            <span class="ind-box week-bg">L–V</span>
            <span>Días hábiles</span>
          </span>
        </div>

        <div class="legend">
          <span class="badge c-d">D</span>
          <span class="badge c-n">N</span>
          <span class="badge c-d8">D8</span>
          <span class="badge c-n8">N8</span>
          <span class="badge c-dr">DR</span>
          <span class="badge c-nr">NR</span>
          <span class="badge c-mix">MIX</span>
          <span class="hint">Festivos CO y domingos en rojo · Sábados en azul</span>
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
      background: #e6f7ed; border: 1px solid #a3e0be; color: #0a5c36; font-size: 0.88rem;
    }
    .primary {
      border-radius: 999px; border: none;
      background: var(--primary-dark); color: #fff; font-weight: 600;
      cursor: pointer; padding: 0.45rem 0.85rem; font-size: 0.82rem;
    }
    .primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .matrix-wrap { overflow: auto; max-height: 70vh; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .matrix { border-collapse: collapse; min-width: 100%; font-size: 0.75rem; }
    th, td { border: 1px solid var(--coraza-border); padding: 0.35rem 0.2rem; text-align: center; min-width: 30px; }
    th { background: #f8fafc; color: #1e293b; position: sticky; top: 0; z-index: 2; font-weight: 700; }
    
    /* DOMINGOS Y FESTIVOS */
    th.col-sunday, th.col-holiday {
      background: #fee2e2 !important;
      color: #991b1b !important;
      border-color: #fca5a5 !important;
    }
    td.col-sunday, td.col-holiday {
      background-color: #fff1f2;
      border-color: #fed7aa;
    }

    /* SABADOS */
    th.col-saturday {
      background: #e0f2fe !important;
      color: #0369a1 !important;
      border-color: #bae6fd !important;
    }
    td.col-saturday {
      background-color: #f0f9ff;
      border-color: #e0f2fe;
    }

    .day-dow {
      font-size: 0.65rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 2px;
      opacity: 0.85;
      text-transform: uppercase;
    }
    .day-num {
      font-size: 0.85rem;
      font-weight: 800;
      line-height: 1;
    }
    .hol-star {
      font-size: 0.65rem;
      color: #dc2626;
      display: block;
      margin-top: 1px;
    }

    .calendar-indicators {
      display: flex;
      gap: 0.85rem;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 0.5rem;
      padding: 0.55rem 0.85rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      font-size: 0.8rem;
    }
    .ind-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #334155;
    }
    .ind-box {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 0.3rem;
      font-weight: 800;
      font-size: 0.72rem;
    }
    .sun-bg { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .sat-bg { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .week-bg { background: #ffffff; color: #475569; border: 1px solid #cbd5e1; }

    .sticky-col {
      position: sticky; left: 0; z-index: 3; text-align: left;
      min-width: 200px; max-width: 260px; background: var(--coraza-surface); padding: 0.45rem 0.65rem;
    }
    thead .sticky-col { z-index: 4; background: #f1f5f9; }
    .meta { margin-top: 0.15rem; font-size: 0.7rem; color: var(--text-secondary); }
    .st {
      display: inline-block; margin-left: 0.35rem; padding: 0.05rem 0.35rem;
      border-radius: 999px; font-size: 0.65rem; text-transform: uppercase; font-weight: 700;
    }
    .st-borrador { background: #e2e8f0; color: #334155; }
    .st-publicado { background: #dcfce7; color: #166534; }
    .st-anulado { background: #fee2e2; color: #991b1b; }
    .cell { font-weight: 700; }
    .c-d { background: #eef2f6; color: #334155; }
    .c-n { background: #e8eef5; color: #1e293b; }
    .c-d8 { background: #e2e8f0; color: #334155; }
    .c-n8 { background: #dbe4ef; color: #0f172a; }
    .c-dr { background: #f1f5f9; color: #64748b; }
    .c-nr { background: #e2e8f0; color: #475569; }
    .c-mix { background: #f8fafc; color: #475569; border: 1px dashed #cbd5e1; }
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
    this.api.getActivePeriod().subscribe({
      next: (p) => {
        this.month = `${p.year}-${String(p.month).padStart(2, '0')}`;
        this.reload();
      },
      error: () => this.reload(),
    });
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
    this.globalMsg.set('Encolando motor global…');
    this.error.set(null);
    this.api
      .generateMotorGlobal({
        year,
        month,
        tipoCiclo: this.tipoCiclo,
        createMissing,
      })
      .subscribe({
        next: (r) => {
          this.globalMsg.set(`Tarea encolada (${r.jobId}). Procesando…`);
          this.pollMotorJob(r.jobId);
        },
        error: (err) => {
          this.busy.set(false);
          const conflictJob = err?.error?.jobId as string | undefined;
          if (err?.status === 409 && conflictJob) {
            this.globalMsg.set('Ya hay un motor en curso; siguiendo progreso…');
            this.busy.set(true);
            this.pollMotorJob(conflictJob);
            return;
          }
          this.error.set(
            err?.error?.message || 'No se pudo encolar el motor global',
          );
        },
      });
  }

  private pollMotorJob(jobId: string): void {
    this.api.getMotorJob(jobId).subscribe({
      next: (s) => {
        if (s.progress) {
          this.globalMsg.set(
            `Motor global: ${s.progress.processed}/${s.progress.total}` +
              ` (ok ${s.progress.ok}, err ${s.progress.failed})`,
          );
        }
        if (s.status === 'completed') {
          this.busy.set(false);
          const r = s.result;
          this.globalMsg.set(
            r
              ? `Motor global ${r.tipoCiclo}: ${r.ok}/${r.processed} OK` +
                  (r.failed ? `, ${r.failed} con error` : '')
              : 'Motor global completado',
          );
          this.reload();
          return;
        }
        if (s.status === 'failed') {
          this.busy.set(false);
          this.error.set(s.failedReason || 'Motor global falló');
          return;
        }
        setTimeout(() => this.pollMotorJob(jobId), 1500);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('No se pudo consultar el estado del motor');
      },
    });
  }

  isWeekend(day: number): boolean {
    const { year, month } = this.yearMonth();
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0 || dow === 6;
  }

  isSunday(day: number): boolean {
    const { year, month } = this.yearMonth();
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 0;
  }

  isSaturday(day: number): boolean {
    const { year, month } = this.yearMonth();
    const dow = new Date(year, month - 1, day).getDay();
    return dow === 6;
  }

  isHoliday(day: number): boolean {
    return Boolean(this.holidayName(day));
  }

  dayOfWeekLetter(day: number): string {
    const { year, month } = this.yearMonth();
    const dow = new Date(year, month - 1, day).getDay();
    const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return letters[dow];
  }

  dayTooltip(day: number): string {
    const { year, month } = this.yearMonth();
    const date = new Date(year, month - 1, day);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hName = this.holidayName(day);
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const prefix = `${dayNames[date.getDay()]} ${day} de ${monthNames[month - 1]} de ${year}`;
    return hName ? `⭐ ${prefix} — FESTIVO: ${hName}` : prefix;
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
