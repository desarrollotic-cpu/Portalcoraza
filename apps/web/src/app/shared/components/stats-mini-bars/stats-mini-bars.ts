import { Component, computed, input } from '@angular/core';

export interface StatsSeriesPoint {
  key: string;
  label: string;
  value: number;
}

@Component({
  selector: 'app-stats-mini-bars',
  template: `
    <section class="stats-bars-card">
      <h3>{{ title() }}</h3>
      @if (loading()) {
        <p class="stats-bars-muted">Cargando…</p>
      } @else if (series().length === 0) {
        <p class="stats-bars-muted">Sin datos</p>
      } @else {
        <div class="stats-bars">
          @for (point of series(); track point.key) {
            <div class="stats-bar-col" [title]="point.label + ': ' + point.value">
              <div class="stats-bar" [style.height.%]="barHeight(point.value)"></div>
              <span class="stats-bar-label">{{ point.label }}</span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .stats-bars-card {
      padding: 1rem 1.1rem;
      border: 1px solid var(--border, var(--coraza-border));
      border-radius: var(--radius, 12px);
      background: var(--surface, var(--coraza-surface));
      box-shadow: var(--shadow-xs, none);
    }
    .stats-bars-card h3 {
      margin: 0 0 0.85rem;
      font-size: 0.95rem;
    }
    .stats-bars-muted {
      margin: 0;
      color: var(--text-muted, var(--text-secondary));
      font-size: 0.88rem;
    }
    .stats-bars {
      display: flex;
      align-items: flex-end;
      gap: 0.35rem;
      height: 120px;
    }
    .stats-bar-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 0.25rem;
    }
    .stats-bar {
      width: 100%;
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      background: color-mix(in srgb, var(--primary, #2563eb) 75%, #93c5fd);
    }
    .stats-bar-label {
      font-size: 0.65rem;
      color: var(--text-muted, var(--text-secondary));
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class StatsMiniBars {
  readonly title = input('Serie');
  readonly series = input<StatsSeriesPoint[]>([]);
  readonly loading = input(false);

  private readonly maxValue = computed(() =>
    Math.max(1, ...this.series().map((p) => p.value)),
  );

  barHeight(value: number): number {
    return Math.max(4, Math.round((value / this.maxValue()) * 100));
  }
}
