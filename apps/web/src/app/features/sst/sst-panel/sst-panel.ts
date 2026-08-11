import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstOverview } from '../sst-api.service';

@Component({
  selector: 'app-sst-panel',
  imports: [DatePipe, RouterLink, StatsKpiGrid],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Panel SST</h2>
          <p>Cumplimiento, alertas críticas (≥3 reincidencias) e inspecciones recientes.</p>
        </div>
        @if (auth.hasPermission('sst.inspect')) {
          <a class="btn" routerLink="/sst/inspecciones/nueva">Nueva inspección</a>
        }
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      @if (!loading() && data(); as d) {
        <div class="card">
          <h3>Inspecciones recientes</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Puesto</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Cumpl.</th>
                <th>Riesgo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (i of d.recent; track i.id) {
                <tr>
                  <td>{{ i.fecha | date: 'dd/MM/yyyy' }}</td>
                  <td>
                    <strong>{{ i.workplace?.nombre || '—' }}</strong>
                    <div class="meta">{{ i.workplace?.client?.nombre }}</div>
                  </td>
                  <td>{{ i.tipo === 'SEGUIMIENTO' ? 'Seguimiento' : 'IPT inicial' }}</td>
                  <td>{{ i.estado }}</td>
                  <td>{{ i.cumplimientoGlobal != null ? i.cumplimientoGlobal + '%' : '—' }}</td>
                  <td>
                    <span class="risk" [attr.data-nivel]="i.nivelRiesgo || ''">
                      {{ i.nivelRiesgo || '—' }}
                    </span>
                  </td>
                  <td>
                    <a class="link" [routerLink]="['/sst/inspecciones', i.id]">Abrir</a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="empty">Aún no hay inspecciones.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
    .btn {
      display: inline-flex; align-items: center; padding: 0.55rem 1rem; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem;
    }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1rem; overflow: auto;
    }
    .card h3 { margin: 0 0 0.75rem; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.55rem 0.4rem; border-bottom: 1px solid var(--border, #e2e8f0); vertical-align: top; }
    th { color: var(--text-muted, #64748b); font-weight: 600; font-size: 0.8rem; }
    .meta { color: var(--text-muted, #64748b); font-size: 0.8rem; }
    .empty { color: var(--text-muted, #64748b); text-align: center; padding: 1.25rem !important; }
    .error { color: #b91c1c; margin: 0; }
    .link { color: var(--brand, #0f766e); font-weight: 600; text-decoration: none; }
    .risk[data-nivel='BAJO'] { color: #15803d; font-weight: 700; }
    .risk[data-nivel='MEDIO'] { color: #ca8a04; font-weight: 700; }
    .risk[data-nivel='ALTO'] { color: #b91c1c; font-weight: 700; }
  `,
})
export class SstPanel implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly data = signal<SstOverview | null>(null);

  readonly kpiItems = computed<StatsKpiItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Inspecciones', value: String(d.inspections), link: '/sst/panel' },
      {
        label: 'Planes abiertos',
        value: String(d.openPlans),
        link: '/sst/planes',
      },
      {
        label: 'Alertas críticas',
        value: String(d.criticalAlerts),
        link: '/sst/planes',
        warn: d.criticalAlerts > 0,
      },
    ];
  });

  ngOnInit(): void {
    this.api.overview().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No se pudo cargar el panel SST');
        this.toast.error(this.error());
      },
    });
  }
}
