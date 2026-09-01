import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { StatsMiniBars, StatsSeriesPoint } from '../../../shared/components/stats-mini-bars/stats-mini-bars';
import { ToastService } from '../../../shared/services/toast.service';
import {
  OperacionesApiService,
  OperacionesPost,
} from '../../operaciones/operaciones-api.service';

interface MonthBucket {
  key: string;
  label: string;
  year: number;
  month: number; // 0-11
  started: OperacionesPost[];
  ended: OperacionesPost[];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
}

function previousTwoMonths(ref = new Date()): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  for (let i = 2; i >= 1; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return out;
}

function inMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

@Component({
  selector: 'app-reception-posts-dashboard',
  imports: [DatePipe, RouterLink, StatsKpiGrid, StatsMiniBars],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Puestos — altas y bajas</h2>
          <p>
            Dos meses anteriores: nuevos por fecha de creación; cerrados al pasar a INACTIVO
            (fecha de última actualización).
          </p>
        </div>
        @if (hasPostsLink) {
          <a class="btn" routerLink="/operaciones/puestos">Ver todos los puestos</a>
        }
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      <div class="charts">
        <app-stats-mini-bars
          title="Puestos nuevos"
          [series]="startedSeries()"
          [loading]="loading()"
        />
        <app-stats-mini-bars
          title="Puestos cerrados"
          [series]="endedSeries()"
          [loading]="loading()"
        />
      </div>

      @for (b of buckets(); track b.key) {
        <div class="month-block">
          <h3>{{ b.label }}</h3>
          <div class="grid-2">
            <div class="card">
              <h4>Nuevos ({{ b.started.length }})</h4>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Cliente</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of b.started; track p.id) {
                    <tr>
                      <td>{{ p.code }}</td>
                      <td>{{ p.name }}</td>
                      <td>{{ p.clientName || '—' }}</td>
                      <td>{{ p.createdAt | date: 'dd/MM/yyyy' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="empty">Ninguno este mes.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="card">
              <h4>Cerrados ({{ b.ended.length }})</h4>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Cliente</th>
                    <th>Cierre*</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of b.ended; track p.id) {
                    <tr>
                      <td>{{ p.code }}</td>
                      <td>{{ p.name }}</td>
                      <td>{{ p.clientName || '—' }}</td>
                      <td>{{ p.updatedAt | date: 'dd/MM/yyyy' }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="empty">Ninguno este mes.</td>
                    </tr>
                  }
                </tbody>
              </table>
              <p class="hint">* Fecha de última actualización del puesto INACTIVO.</p>
            </div>
          </div>
        </div>
      }
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
    .head h2 { margin: 0 0 0.3rem; color: var(--primary-dark); font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; max-width: 40rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      background: var(--primary);
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .error { color: #b91c1c; margin: 0; }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .month-block h3 {
      margin: 0 0 0.75rem;
      font-size: 1.05rem;
      text-transform: capitalize;
      color: var(--text, var(--coraza-text));
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .card {
      padding: 1rem;
      border: 1px solid var(--border, var(--coraza-border));
      border-radius: var(--radius, 12px);
      background: var(--surface, var(--coraza-surface));
    }
    .card h4 { margin: 0 0 0.75rem; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { text-align: left; padding: 0.45rem 0.35rem; border-bottom: 1px solid var(--border, #e5e7eb); }
    th { color: var(--text-secondary); font-weight: 600; font-size: 0.75rem; }
    .empty { color: var(--text-secondary); font-style: italic; }
    .hint { margin: 0.5rem 0 0; font-size: 0.75rem; color: var(--text-secondary); }
  `,
})
export class ReceptionPostsDashboard implements OnInit {
  private readonly api = inject(OperacionesApiService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly buckets = signal<MonthBucket[]>([]);

  /** Always true while posts.view is required to open operaciones. */
  readonly hasPostsLink = true;

  readonly kpiItems = computed<StatsKpiItem[]>(() => {
    const bs = this.buckets();
    const started = bs.reduce((n, b) => n + b.started.length, 0);
    const ended = bs.reduce((n, b) => n + b.ended.length, 0);
    return [
      { label: 'Meses', value: bs.length, hint: 'calendario anteriores' },
      { label: 'Nuevos', value: started, hint: 'suma 2 meses' },
      { label: 'Cerrados', value: ended, hint: 'suma 2 meses' },
      {
        label: 'Neto',
        value: started - ended,
        hint: 'nuevos − cerrados',
        warn: started - ended < 0,
      },
    ];
  });

  readonly startedSeries = computed<StatsSeriesPoint[]>(() =>
    this.buckets().map((b) => ({
      key: `${b.key}-s`,
      label: b.label.split(' ')[0]!.slice(0, 3),
      value: b.started.length,
    })),
  );

  readonly endedSeries = computed<StatsSeriesPoint[]>(() =>
    this.buckets().map((b) => ({
      key: `${b.key}-e`,
      label: b.label.split(' ')[0]!.slice(0, 3),
      value: b.ended.length,
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listPosts().subscribe({
      next: (posts) => {
        this.buckets.set(this.buildBuckets(posts));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los puestos.');
        this.toast.error('Error al cargar puestos');
        this.loading.set(false);
      },
    });
  }

  private buildBuckets(posts: OperacionesPost[]): MonthBucket[] {
    return previousTwoMonths().map(({ year, month }) => {
      const key = monthKey(new Date(year, month, 1));
      return {
        key,
        label: monthLabel(year, month),
        year,
        month,
        started: posts.filter((p) => inMonth(p.createdAt, year, month)),
        ended: posts.filter(
          (p) => p.status === 'INACTIVO' && inMonth(p.updatedAt, year, month),
        ),
      };
    });
  }
}
