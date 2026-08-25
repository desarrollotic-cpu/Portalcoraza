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
          <p>
            IPT (34 ítems / 7 categorías), seguimiento, planes de acción y alertas críticas (≥3
            reincidencias). Semáforo: BAJO ≥90% · MEDIO ≥70% · ALTO &lt;70%.
          </p>
        </div>
        @if (auth.hasPermission('sst.inspect') && !needsSites()) {
          <a class="btn" routerLink="/sst/inspecciones/nueva">Nueva inspección</a>
        }
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      @if (!loading() && needsSites()) {
        <div class="wizard">
          <h3>Configuración inicial</h3>
          <p>
            Para operar SST debes registrar al menos un cliente y un puesto de trabajo (portería,
            recepción, perímetro, etc.).
          </p>
          <div class="wizard-actions">
            @if (auth.hasPermission('sst.manage')) {
              <button type="button" class="btn" [disabled]="seeding()" (click)="seedSites()">
                {{ seeding() ? 'Creando…' : 'Crear puestos sede Coraza' }}
              </button>
              <a class="btn ghost" routerLink="/sst/puestos">Gestionar clientes y puestos</a>
            }
          </div>
          <p class="meta">Catálogo oficial: {{ data()?.checklistItems ?? 0 }} ítems IPT</p>
        </div>
      } @else if (!loading() && needsFirstIpt()) {
        <div class="wizard">
          <h3>Listo para la primera IPT</h3>
          <p>
            Hay {{ data()?.workplaces }} puesto(s) y el checklist de 34 ítems. Crea la Inspección
            Preventiva de Puesto (IPT inicial), califica SEGURO / RIESGOSO / N/A y, si es RIESGOSO,
            registra hallazgo y plan de acción.
          </p>
          <div class="wizard-actions">
            @if (auth.hasPermission('sst.inspect')) {
              <a class="btn" routerLink="/sst/inspecciones/nueva">Iniciar IPT inicial</a>
            }
            @if (auth.hasPermission('sst.manage')) {
              <a class="btn ghost" routerLink="/sst/puestos">Ver puestos</a>
            }
          </div>
        </div>
      }

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
                  <td colspan="7" class="empty">
                    Sin inspecciones registradas.
                    @if (auth.hasPermission('sst.inspect') && !needsSites()) {
                      <a class="link" routerLink="/sst/inspecciones/nueva"> Crear IPT inicial</a>
                    }
                  </td>
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
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; max-width: 52rem; }
    .btn {
      display: inline-flex; align-items: center; padding: 0.55rem 1rem; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; text-decoration: none; font-weight: 600; font-size: 0.9rem;
      border: 0; cursor: pointer;
    }
    .btn.ghost {
      background: transparent; color: var(--brand, #0f766e); border: 1px solid var(--border, #cbd5e1);
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .wizard {
      background: color-mix(in srgb, var(--brand, #0f766e) 8%, var(--surface, #fff));
      border: 1px solid var(--border, #e2e8f0); border-radius: 0.75rem; padding: 1.1rem 1.25rem;
    }
    .wizard h3 { margin: 0 0 0.45rem; font-size: 1.05rem; }
    .wizard p { margin: 0 0 0.85rem; font-size: 0.9rem; color: var(--text-muted, #475569); }
    .wizard-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.35rem; }
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
  readonly seeding = signal(false);
  readonly error = signal('');
  readonly data = signal<SstOverview | null>(null);

  readonly needsSites = computed(() => (this.data()?.workplaces ?? 0) === 0);
  readonly needsFirstIpt = computed(() => {
    const d = this.data();
    return !!d && d.workplaces > 0 && d.inspections === 0;
  });

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
      {
        label: 'Puestos SST',
        value: String(d.workplaces ?? 0),
        link: '/sst/puestos',
      },
    ];
  });

  ngOnInit(): void {
    this.reload();
  }

  seedSites(): void {
    this.seeding.set(true);
    this.api.bootstrapDemo().subscribe({
      next: (r) => {
        this.seeding.set(false);
        this.toast.success(
          r.created ? 'Puestos de sede Coraza creados' : 'Los puestos ya estaban registrados',
        );
        this.reload();
      },
      error: (e) => {
        this.seeding.set(false);
        this.toast.error(e?.error?.message || 'No se pudieron crear los puestos');
      },
    });
  }

  private reload(): void {
    this.loading.set(true);
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
