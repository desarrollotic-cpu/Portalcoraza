import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstPlanStatus, SstResponseRow } from '../sst-api.service';

@Component({
  selector: 'app-sst-action-plans',
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Planes de Acción SST</h2>
          <p>
            Seguimiento a hallazgos <strong>RIESGOSO</strong> identificados en las inspecciones IPT.
            Reincidencia ≥3 genera alerta crítica.
          </p>
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
        <div class="card-header-bar">
          <h3>
            Listado de planes ({{ filteredRows().length }}
            @if (filteredRows().length !== rows().length) {
              de {{ rows().length }}
            })
          </h3>
          <input
            type="search"
            placeholder="Buscar por pregunta, hallazgo, responsable o puesto…"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            class="search-input"
          />
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Ítem y Pregunta oficial IPT</th>
              <th style="width: 18%;">Puesto y Cliente</th>
              <th style="width: 26%;">Hallazgo y Plan de acción</th>
              <th style="width: 12%;">Compromiso</th>
              <th style="width: 10%;">Estado</th>
              <th style="width: 6%;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (r of filteredRows(); track r.id) {
              <tr [class.critical]="r.reincidenciaCount >= 3" [class.closed]="r.estadoPlanAccion === 'CERRADO'">
                <td>
                  <div class="item-tag">
                    <span class="badge-code">Ítem #{{ r.item?.codigo }}</span>
                    <span class="badge-cat">{{ r.item?.categoria }}</span>
                  </div>
                  <div class="item-pregunta">
                    {{ r.item?.pregunta || 'Pregunta no especificada' }}
                  </div>
                  @if (r.reincidenciaCount > 0) {
                    <div class="reinc-badge" [class.alert]="r.reincidenciaCount >= 3">
                      ⚠️ Reincidencia: {{ r.reincidenciaCount }} veces
                    </div>
                  }
                </td>
                <td>
                  <div class="puesto-name">{{ r.inspection?.workplace?.nombre || '—' }}</div>
                  <div class="meta">{{ r.inspection?.workplace?.client?.nombre }}</div>
                  @if (r.inspection?.fecha) {
                    <div class="meta-date">IPT: {{ r.inspection!.fecha | date: 'dd/MM/yyyy' }}</div>
                  }
                </td>
                <td>
                  <div class="hallazgo-box">
                    <strong>Hallazgo:</strong> {{ r.hallazgo || 'Sin descripción de hallazgo' }}
                  </div>
                  @if (r.planAccionPropuesto) {
                    <div class="plan-box">
                      <strong>Plan correctivo:</strong> {{ r.planAccionPropuesto }}
                    </div>
                  }
                  @if (r.responsablePlanAccion) {
                    <div class="meta-resp">
                      👤 Resp: <em>{{ r.responsablePlanAccion }}</em>
                    </div>
                  }
                </td>
                <td>
                  <div [class.overdue]="isOverdue(r.fechaCompromiso, r.estadoPlanAccion)">
                    {{ r.fechaCompromiso ? (r.fechaCompromiso | date: 'dd/MM/yyyy') : 'Sin fecha' }}
                  </div>
                  @if (isOverdue(r.fechaCompromiso, r.estadoPlanAccion)) {
                    <span class="tag-overdue">Vencido</span>
                  }
                </td>
                <td>
                  <span class="status-badge" [attr.data-status]="r.estadoPlanAccion || 'ABIERTO'">
                    {{ formatStatus(r.estadoPlanAccion) }}
                  </span>
                </td>
                <td class="ops">
                  @if (r.inspection?.id) {
                    <a class="btn-link" [routerLink]="['/sst/inspecciones', r.inspection!.id]" title="Abrir inspección">
                      Ver IPT
                    </a>
                  }
                  @if (canEditPlans() && r.estadoPlanAccion !== 'CERRADO') {
                    @if (r.estadoPlanAccion !== 'EN_PROCESO') {
                      <button type="button" class="mini-btn btn-process" (click)="setStatus(r, 'EN_PROCESO')" title="Pasar a En Proceso">
                        En proceso
                      </button>
                    }
                    <button type="button" class="mini-btn btn-close" (click)="setStatus(r, 'CERRADO')" title="Marcar como Cerrado">
                      Cerrar
                    </button>
                  } @else if (canEditPlans() && r.estadoPlanAccion === 'CERRADO') {
                    <button type="button" class="mini-btn btn-reopen" (click)="setStatus(r, 'ABIERTO')" title="Reabrir plan">
                      Reabrir
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">
                  {{ loading() ? 'Cargando planes de acción…' : 'No se encontraron planes de acción para este filtro.' }}
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
    .head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; flex-wrap: wrap; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; max-width: 50rem; }
    .filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip {
      border: 1px solid var(--border, #cbd5e1); background: var(--surface, #fff);
      border-radius: 999px; padding: 0.35rem 0.8rem; font-size: 0.82rem; font-weight: 500; cursor: pointer;
      transition: all 0.15s;
    }
    .chip.active { background: var(--brand, #0f766e); color: #fff; border-color: transparent; font-weight: 600; }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1.1rem; overflow: auto; display: flex; flex-direction: column; gap: 0.85rem;
    }
    .card-header-bar {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
    }
    .card-header-bar h3 { margin: 0; font-size: 1rem; }
    .search-input {
      font: inherit; padding: 0.45rem 0.8rem; border-radius: 0.5rem; border: 1px solid var(--border, #cbd5e1);
      width: 100%; max-width: 360px; font-size: 0.85rem; background: var(--bg, #fff);
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { text-align: left; padding: 0.65rem 0.45rem; border-bottom: 1px solid var(--border, #e2e8f0); vertical-align: top; }
    th { color: var(--text-muted, #64748b); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .item-tag { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; flex-wrap: wrap; }
    .badge-code {
      background: #0f766e; color: #fff; font-size: 0.72rem; font-weight: 700;
      padding: 0.15rem 0.45rem; border-radius: 0.3rem;
    }
    .badge-cat {
      background: #f1f5f9; color: #475569; font-size: 0.72rem; font-weight: 600;
      padding: 0.15rem 0.45rem; border-radius: 0.3rem; border: 1px solid #e2e8f0;
    }
    .item-pregunta { font-weight: 600; color: #1e293b; font-size: 0.88rem; line-height: 1.35; }
    .reinc-badge {
      display: inline-block; margin-top: 0.35rem; font-size: 0.75rem; font-weight: 600;
      color: #ca8a04; background: #fef9c3; padding: 0.15rem 0.4rem; border-radius: 0.3rem;
    }
    .reinc-badge.alert { color: #b91c1c; background: #fee2e2; }
    .puesto-name { font-weight: 600; color: #0f172a; }
    .meta { color: var(--text-muted, #64748b); font-size: 0.8rem; margin-top: 0.15rem; }
    .meta-date { font-size: 0.76rem; color: #64748b; margin-top: 0.2rem; }
    .hallazgo-box { color: #991b1b; font-size: 0.85rem; line-height: 1.35; margin-bottom: 0.35rem; }
    .plan-box { color: #0f766e; font-size: 0.85rem; line-height: 1.35; margin-bottom: 0.25rem; }
    .meta-resp { font-size: 0.78rem; color: #475569; }
    .overdue { color: #b91c1c; font-weight: 700; }
    .tag-overdue {
      display: inline-block; font-size: 0.68rem; font-weight: 700; color: #b91c1c;
      background: #fee2e2; padding: 0.1rem 0.35rem; border-radius: 0.25rem; text-transform: uppercase;
    }
    .status-badge {
      display: inline-flex; align-items: center; padding: 0.2rem 0.55rem; border-radius: 0.4rem;
      font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    }
    .status-badge[data-status='ABIERTO'] { background: #fef3c7; color: #92400e; }
    .status-badge[data-status='EN_PROCESO'] { background: #dbeafe; color: #1e40af; }
    .status-badge[data-status='CERRADO'] { background: #dcfce7; color: #15803d; }
    .status-badge[data-status='REINCIDENTE'] { background: #fee2e2; color: #991b1b; }
    .ops { display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-start; }
    .btn-link {
      color: var(--brand, #0f766e); font-weight: 600; font-size: 0.8rem; text-decoration: none;
      padding: 0.2rem 0.4rem; border-radius: 0.3rem; background: color-mix(in srgb, var(--brand, #0f766e) 10%, transparent);
    }
    .mini-btn {
      border: 1px solid var(--border, #cbd5e1); background: var(--surface, #fff);
      border-radius: 0.35rem; padding: 0.25rem 0.5rem; font-size: 0.74rem; cursor: pointer; font-weight: 600;
      white-space: nowrap; transition: background 0.15s;
    }
    .mini-btn.btn-process { color: #1d4ed8; border-color: #93c5fd; }
    .mini-btn.btn-process:hover { background: #eff6ff; }
    .mini-btn.btn-close { color: #15803d; border-color: #86efac; }
    .mini-btn.btn-close:hover { background: #f0fdf4; }
    .mini-btn.btn-reopen { color: #b45309; border-color: #fde68a; }
    .empty { text-align: center; color: var(--text-muted, #64748b); padding: 1.5rem !important; }
    tr.critical { background: color-mix(in srgb, #fecaca 25%, transparent); }
    tr.closed { opacity: 0.75; }
  `,
})
export class SstActionPlans implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly filters = [
    { id: '', label: 'Todos' },
    { id: 'abiertos', label: 'Abiertos' },
    { id: 'vencidos', label: 'Vencidos' },
    { id: 'reincidentes', label: 'Reincidentes (≥3)' },
    { id: 'cerrados', label: 'Cerrados' },
  ];

  readonly filter = signal('');
  readonly rows = signal<SstResponseRow[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');

  readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.rows();
    if (!q) return list;
    return list.filter((r) => {
      const pregunta = r.item?.pregunta?.toLowerCase() || '';
      const cat = r.item?.categoria?.toLowerCase() || '';
      const codigo = String(r.item?.codigo || '');
      const hallazgo = r.hallazgo?.toLowerCase() || '';
      const plan = r.planAccionPropuesto?.toLowerCase() || '';
      const puesto = r.inspection?.workplace?.nombre?.toLowerCase() || '';
      const cliente = r.inspection?.workplace?.client?.nombre?.toLowerCase() || '';
      const resp = r.responsablePlanAccion?.toLowerCase() || '';
      return (
        pregunta.includes(q) ||
        cat.includes(q) ||
        codigo.includes(q) ||
        hallazgo.includes(q) ||
        plan.includes(q) ||
        puesto.includes(q) ||
        cliente.includes(q) ||
        resp.includes(q)
      );
    });
  });

  ngOnInit(): void {
    this.load();
  }

  canEditPlans(): boolean {
    return this.auth.hasPermission('sst.inspect');
  }

  setFilter(id: string): void {
    this.filter.set(id);
    this.load();
  }

  formatStatus(st: SstPlanStatus | null | undefined): string {
    switch (st) {
      case 'ABIERTO':
        return 'Abierto';
      case 'EN_PROCESO':
        return 'En proceso';
      case 'CERRADO':
        return 'Cerrado';
      case 'REINCIDENTE':
        return 'Reincidente';
      default:
        return 'Abierto';
    }
  }

  isOverdue(fechaCompromiso: string | null | undefined, estado: SstPlanStatus | null | undefined): boolean {
    if (!fechaCompromiso || estado === 'CERRADO') return false;
    const today = new Date().toISOString().slice(0, 10);
    return fechaCompromiso < today;
  }

  setStatus(row: SstResponseRow, estadoPlanAccion: SstPlanStatus): void {
    this.api.updatePlan(row.id, { estadoPlanAccion }).subscribe({
      next: () => {
        this.toast.success(`Plan actualizado a: ${this.formatStatus(estadoPlanAccion)}`);
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message || 'No se pudo actualizar el plan'),
    });
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
