import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { SchedulingApiService, ShiftSchedule } from '../scheduling-api.service';

@Component({
  selector: 'app-schedule-matrix',
  imports: [RouterLink],
  template: `
    <section>
      <header>
        <h2>Programación — Matriz mensual</h2>
        <p>Vista operativa tipo Excel por asociado y día.</p>
        <div class="toolbar">
          <label>
            Puesto
            <select [value]="postId()" (change)="onPostChange($event)">
              <option value="">Seleccione...</option>
              @for (p of posts(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </label>
          <label>
            Mes
            <input type="month" [value]="month()" (change)="onMonthChange($event)" />
          </label>
          <a routerLink="/programacion/calendario">Vista calendario</a>
          <a routerLink="/programacion/turno/nuevo">Asignar turno</a>
        </div>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (!postId()) {
        <p>Selecciona un puesto para ver la matriz.</p>
      } @else {
        <div class="matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="sticky-col">Asociado</th>
                @for (day of days(); track day) {
                  <th>{{ day }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (a of associates(); track a.id) {
                <tr>
                  <td class="sticky-col">{{ associateName(a) }}</td>
                  @for (day of days(); track day) {
                    <td
                      class="cell"
                      [class]="cellClass(a.id, day)"
                      (click)="openCell(a.id, day)"
                      [title]="cellTitle(a.id, day)"
                    >
                      {{ cellLabel(a.id, day) }}
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="days().length + 1">No hay asociados activos.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="legend">
          <span class="badge day">D Diurno</span>
          <span class="badge night">N Nocturno</span>
          <span class="badge rest">R Descanso</span>
          <span class="hint">Clic en celda para asignar o editar turno</span>
        </div>
      }
    </section>
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); font-weight: 600; }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    select, input { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .matrix-wrap { overflow: auto; max-height: 70vh; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .matrix { border-collapse: collapse; min-width: 100%; font-size: 0.75rem; }
    th, td { border: 1px solid var(--coraza-border); padding: 0.35rem; text-align: center; min-width: 28px; }
    th { background: var(--primary-50); position: sticky; top: 0; z-index: 1; }
    .sticky-col { position: sticky; left: 0; background: var(--coraza-surface); text-align: left; min-width: 140px; z-index: 2; font-weight: 500; }
    .cell { cursor: pointer; user-select: none; }
    .cell:hover { background: var(--primary-50); }
    .cell.day { background: #e8f5e9; }
    .cell.night { background: #e3f2fd; }
    .cell.rest { background: #f5f5f5; color: #666; }
    .legend { margin-top: 0.75rem; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .badge { font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 999px; }
    .badge.day { background: #e8f5e9; }
    .badge.night { background: #e3f2fd; }
    .badge.rest { background: #eee; }
    .hint { color: var(--coraza-text-muted); font-size: 0.8rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class ScheduleMatrix implements OnInit {
  private readonly api = inject(SchedulingApiService);
  private readonly associatesApi = inject(AssociatesApiService);
  private readonly router = inject(Router);

  readonly posts = signal<{ id: string; name: string }[]>([]);
  readonly associates = signal<Associate[]>([]);
  readonly shifts = signal<ShiftSchedule[]>([]);
  readonly postId = signal('');
  readonly month = signal(this.currentMonth());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly days = computed(() => {
    const [year, mon] = this.month().split('-').map(Number);
    const count = new Date(year, mon, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  private readonly shiftMap = computed(() => {
    const map = new Map<string, ShiftSchedule>();
    for (const s of this.shifts()) {
      map.set(`${s.associateId}:${s.shiftDate}`, s);
    }
    return map;
  });

  ngOnInit(): void {
    this.api.listPosts().subscribe({
      next: (posts) => this.posts.set(posts),
      error: () => this.error.set('No se pudieron cargar puestos'),
    });

    this.associatesApi.list('ACTIVO').subscribe({
      next: (list) => this.associates.set(list),
      error: () => this.error.set('No se pudieron cargar asociados'),
    });
  }

  onPostChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.postId.set(value);
    this.loadShifts();
  }

  onMonthChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.month.set(value);
    this.loadShifts();
  }

  cellLabel(associateId: string, day: number): string {
    const shift = this.shiftMap().get(`${associateId}:${this.dateForDay(day)}`);
    if (!shift) return '';
    if (shift.shiftType === 'DAY') return 'D';
    if (shift.shiftType === 'NIGHT') return 'N';
    return 'R';
  }

  cellClass(associateId: string, day: number): string {
    const shift = this.shiftMap().get(`${associateId}:${this.dateForDay(day)}`);
    if (!shift) return 'cell';
    if (shift.shiftType === 'DAY') return 'cell day';
    if (shift.shiftType === 'NIGHT') return 'cell night';
    return 'cell rest';
  }

  cellTitle(associateId: string, day: number): string {
    const shift = this.shiftMap().get(`${associateId}:${this.dateForDay(day)}`);
    if (!shift) return 'Sin turno — clic para asignar';
    const type =
      shift.shiftType === 'DAY' ? 'Diurno' : shift.shiftType === 'NIGHT' ? 'Nocturno' : 'Descanso';
    return `${type} ${shift.workdayHours}h`;
  }

  openCell(associateId: string, day: number): void {
    const postId = this.postId();
    if (!postId) return;

    const date = this.dateForDay(day);
    const existing = this.shiftMap().get(`${associateId}:${date}`);

    void this.router.navigate(
      existing
        ? ['/programacion/turno', existing.id, 'editar']
        : ['/programacion/turno/nuevo'],
      {
        queryParams: { postId, associateId, shiftDate: date },
      },
    );
  }

  associateName(a: Associate): string {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name || a.documentNumber || '—';
  }

  private loadShifts(): void {
    const postId = this.postId();
    if (!postId) return;

    const [year, mon] = this.month().split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const startDate = `${this.month()}-01`;
    const endDate = `${this.month()}-${String(lastDay).padStart(2, '0')}`;

    this.loading.set(true);
    this.api.listShifts({ postId, startDate, endDate }).subscribe({
      next: (shifts) => {
        this.shifts.set(shifts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la programación');
      },
    });
  }

  private dateForDay(day: number): string {
    return `${this.month()}-${String(day).padStart(2, '0')}`;
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
