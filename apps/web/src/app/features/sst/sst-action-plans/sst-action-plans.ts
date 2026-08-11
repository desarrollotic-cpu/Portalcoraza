import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstResponseRow } from '../sst-api.service';

@Component({
  selector: 'app-sst-action-plans',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Planes de acción</h2>
          <p>Hallazgos RIESGOSO, vencidos y reincidencias críticas.</p>
        </div>
        <div class="filters">
          @for (f of filters; track f.id) {
            <button
              type="button"
              class="chip"
              [class.active]="filter() === f.id"
              (click)="setFilter(f.id)"
            >
              {{ f.label }}
            </button>
          }
        </div>
      </header>

      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Ítem</th>
              <th>Puesto</th>
              <th>Hallazgo / plan</th>
              <th>Compromiso</th>
              <th>Estado</th>
              <th>Reinc.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr [class.critical]="r.reincidenciaCount >= 3">
                <td>
                  <strong>#{{ r.item?.codigo }}</strong>
                  <div class="meta">{{ r.item?.categoria }}</div>
                </td>
                <td>
                  {{ r.inspection?.workplace?.nombre || '—' }}
                  <div class="meta">{{ r.inspection?.workplace?.client?.nombre }}</div>
                </td>
                <td>
                  <div>{{ r.hallazgo || '—' }}</div>
                  <div class="meta">{{ r.planAccionPropuesto }}</div>
                </td>
                <td>{{ r.fechaCompromiso ? (r.fechaCompromiso | date: 'dd/MM/yyyy') : '—' }}</td>
                <td>{{ r.estadoPlanAccion || '—' }}</td>
                <td>
                  <span [class.alert]="r.reincidenciaCount >= 3">{{ r.reincidenciaCount }}</span>
                </td>
                <td>
                  @if (r.inspection?.id) {
                    <a class="link" [routerLink]="['/sst/inspecciones', r.inspection!.id]">Ver</a>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty">
                  {{ loading() ? 'Cargando…' : 'Sin planes para este filtro.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .head { display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
    .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip {
      border: 1px solid var(--border, #cbd5e1); background: var(--surface, #fff);
      border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.8rem; cursor: pointer;
    }
    .chip.active { background: var(--brand, #0f766e); color: #fff; border-color: transparent; }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1rem; overflow: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { text-align: left; padding: 0.55rem 0.35rem; border-bottom: 1px solid var(--border, #e2e8f0); vertical-align: top; }
    th { color: var(--text-muted, #64748b); font-size: 0.78rem; }
    .meta { color: var(--text-muted, #64748b); font-size: 0.78rem; margin-top: 0.15rem; }
    .empty { text-align: center; color: var(--text-muted, #64748b); padding: 1.25rem !important; }
    .link { color: var(--brand, #0f766e); font-weight: 600; text-decoration: none; }
    tr.critical { background: color-mix(in srgb, #fecaca 35%, transparent); }
    .alert { color: #b91c1c; font-weight: 800; }
  `,
})
export class SstActionPlans implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);

  readonly filters = [
    { id: '', label: 'Todos' },
    { id: 'abiertos', label: 'Abiertos' },
    { id: 'vencidos', label: 'Vencidos' },
    { id: 'reincidentes', label: 'Reincidentes' },
    { id: 'cerrados', label: 'Cerrados' },
  ];

  readonly filter = signal('');
  readonly rows = signal<SstResponseRow[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
  }

  setFilter(id: string): void {
    this.filter.set(id);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.actionPlans(this.filter() || undefined).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'No se pudieron cargar los planes');
      },
    });
  }
}
