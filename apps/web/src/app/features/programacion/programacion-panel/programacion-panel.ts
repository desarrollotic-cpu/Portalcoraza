import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  MonthlySchedulingApiService,
  ProgramacionOverview,
} from '../monthly-scheduling-api.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { StatsMiniBars } from '../../../shared/components/stats-mini-bars/stats-mini-bars';

@Component({
  selector: 'app-programacion-panel',
  imports: [StatsKpiGrid, StatsMiniBars],
  template: `
    <div class="prog-panel">
      <header class="prog-panel__head">
        <div>
          <h2>Panel de programación</h2>
          <p>Resumen del mes {{ monthLabel() }}. Datos del cuadro mensual y conflictos.</p>
        </div>
      </header>

      @if (error()) {
        <p class="prog-panel__error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

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
    .prog-panel__head h2 {
      margin: 0 0 0.25rem;
      font-size: 1.15rem;
    }
    .prog-panel__head p {
      margin: 0;
      color: var(--text-muted, var(--text-secondary));
      font-size: 0.9rem;
    }
    .prog-panel__error {
      margin: 0;
      color: var(--coraza-error, #b91c1c);
      font-size: 0.9rem;
    }
    .prog-panel__chart {
      max-width: 720px;
    }
  `,
})
export class ProgramacionPanel implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<ProgramacionOverview | null>(null);

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
        link: '/programacion/matriz',
        warn: (k?.conflicts ?? 0) > 0,
      },
      {
        label: 'Plantillas',
        value: k?.templates ?? '—',
        hint: 'Disponibles para aplicar',
        link: '/programacion/cuadro',
      },
    ];
  });

  ngOnInit(): void {
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
}
