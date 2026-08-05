import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface StatsKpiItem {
  label: string;
  value: string | number;
  hint?: string;
  link?: string | null;
  warn?: boolean;
}

@Component({
  selector: 'app-stats-kpi-grid',
  imports: [RouterLink],
  template: `
    @if (loading()) {
      <div class="dot-dash-kpi-grid">
        @for (i of skeletons; track i) {
          <div class="stats-kpi-skel"></div>
        }
      </div>
    } @else {
      <div class="dot-dash-kpi-grid">
        @for (item of items(); track item.label) {
          @if (item.link) {
            <a [routerLink]="item.link" class="dot-dash-kpi">
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">{{ item.label }}</span>
                <strong class="dot-dash-kpi__value" [class.stats-kpi-warn]="item.warn">{{ item.value }}</strong>
                @if (item.hint) {
                  <span class="dot-dash-kpi__hint">{{ item.hint }}</span>
                }
              </div>
            </a>
          } @else {
            <div class="dot-dash-kpi">
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">{{ item.label }}</span>
                <strong class="dot-dash-kpi__value" [class.stats-kpi-warn]="item.warn">{{ item.value }}</strong>
                @if (item.hint) {
                  <span class="dot-dash-kpi__hint">{{ item.hint }}</span>
                }
              </div>
            </div>
          }
        }
      </div>
    }
  `,
  styles: `
    .stats-kpi-skel {
      min-height: 88px;
      border-radius: var(--radius);
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface) 50%, var(--surface-2) 75%);
      background-size: 200% 100%;
      animation: stats-skel 1.2s ease-in-out infinite;
    }
    .stats-kpi-warn {
      color: #b45309;
    }
    @keyframes stats-skel {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
  `,
})
export class StatsKpiGrid {
  readonly items = input<StatsKpiItem[]>([]);
  readonly loading = input(false);
  readonly skeletons = [0, 1, 2, 3];
}
