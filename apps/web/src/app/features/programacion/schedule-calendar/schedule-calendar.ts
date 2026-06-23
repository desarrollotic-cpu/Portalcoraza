import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { SchedulingApiService, ShiftSchedule } from '../scheduling-api.service';

@Component({
  selector: 'app-schedule-calendar',
  imports: [RouterLink],
  template: `
    <section>
      <header>
        <h2>Programación — Calendario</h2>
        <p>Vista complementaria por fecha.</p>
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
          <a routerLink="/programacion">Matriz mensual</a>
        </div>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (!postId()) {
        <p>Selecciona un puesto.</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Asociado</th>
              <th>Turno</th>
              <th>Jornada</th>
            </tr>
          </thead>
          <tbody>
            @for (s of shifts(); track s.id) {
              <tr>
                <td>{{ s.shiftDate }}</td>
                <td>{{ associateName(s.associateId) }}</td>
                <td>{{ shiftLabel(s.shiftType) }}</td>
                <td>{{ s.workdayHours }}h</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4">Sin turnos en este rango.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); }
    .toolbar { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; align-items: end; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    select, input { padding: 0.45rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; background: var(--coraza-surface); border: 1px solid var(--coraza-border); }
    th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--coraza-border); text-align: left; }
    th { background: var(--primary-50); font-size: 0.75rem; text-transform: uppercase; }
    .error { color: var(--coraza-error); }
  `,
})
export class ScheduleCalendar implements OnInit {
  private readonly api = inject(SchedulingApiService);
  private readonly associatesApi = inject(AssociatesApiService);

  readonly posts = signal<{ id: string; name: string }[]>([]);
  readonly associates = signal<Associate[]>([]);
  readonly shifts = signal<ShiftSchedule[]>([]);
  readonly postId = signal('');
  readonly month = signal(this.currentMonth());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      posts: this.api.listPosts(),
      associates: this.associatesApi.list('ACTIVO'),
    }).subscribe({
      next: ({ posts, associates }) => {
        this.posts.set(posts);
        this.associates.set(associates);
      },
      error: () => this.error.set('Error al cargar datos'),
    });
  }

  onPostChange(event: Event): void {
    this.postId.set((event.target as HTMLSelectElement).value);
    this.loadShifts();
  }

  onMonthChange(event: Event): void {
    this.month.set((event.target as HTMLInputElement).value);
    this.loadShifts();
  }

  associateName(id: string): string {
    const a = this.associates().find((x) => x.id === id);
    if (!a) return id.slice(0, 8);
    return [a.firstName, a.lastName].filter(Boolean).join(' ') || a.documentNumber || '—';
  }

  shiftLabel(type: string): string {
    if (type === 'DAY') return 'Diurno';
    if (type === 'NIGHT') return 'Nocturno';
    return 'Descanso';
  }

  private loadShifts(): void {
    const postId = this.postId();
    if (!postId) return;

    const [year, mon] = this.month().split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();

    this.loading.set(true);
    this.api
      .listShifts({
        postId,
        startDate: `${this.month()}-01`,
        endDate: `${this.month()}-${String(lastDay).padStart(2, '0')}`,
      })
      .subscribe({
        next: (shifts) => {
          this.shifts.set(shifts);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo cargar turnos');
        },
      });
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
