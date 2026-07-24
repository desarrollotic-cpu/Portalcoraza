import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../shared/services/toast.service';
import {
  ReceptionApiService,
  ReceptionDashboard,
  ReceptionVisitor,
} from '../reception-api.service';

@Component({
  selector: 'app-reception-panel',
  imports: [DatePipe, RouterLink, ConfirmDialog],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Panel de control</h2>
          <p>Estadísticas visuales de visitantes. Los datos permanecen en Supabase.</p>
        </div>
        @if (auth.hasPermission('reception.register')) {
          <a class="btn" routerLink="/recepcion/registrar">Registrar visitante</a>
        }
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (data(); as d) {
        <div class="kpis">
          <div class="kpi warn">
            <strong>{{ d.stats.insideNow }}</strong>
            <span>Dentro ahora</span>
          </div>
          <div class="kpi">
            <strong>{{ d.stats.todayEntries }}</strong>
            <span>Visitantes hoy</span>
          </div>
          <div class="kpi">
            <strong>{{ d.stats.monthEntries }}</strong>
            <span>Este mes</span>
          </div>
          <div class="kpi">
            <strong>{{ d.stats.yearEntries }}</strong>
            <span>Este año</span>
          </div>
          <div class="kpi muted">
            <strong>{{ d.stats.totalEntries }}</strong>
            <span>Histórico total</span>
          </div>
        </div>

        <div class="chart-card">
          <h3>Últimos 14 días</h3>
          <div class="bars">
            @for (day of d.last14Days; track day.day) {
              <div class="bar-col" [title]="day.day + ': ' + day.entries">
                <div class="bar" [style.height.%]="barHeight(day.entries, d)"></div>
                <span class="bar-label">{{ day.day.slice(8) }}</span>
              </div>
            }
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <h3>Dentro ahora</h3>
            <table>
              <thead>
                <tr>
                  <th>Visitante</th>
                  <th>Entrada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (v of d.insideNow; track v.id) {
                  <tr>
                    <td>
                      <strong>{{ v.displayName }}</strong>
                      @if (v.documentNumber) {
                        <div class="meta">{{ v.documentNumber }}</div>
                      }
                    </td>
                    <td>{{ v.entryAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td class="actions">
                      @if (auth.hasPermission('reception.exit')) {
                        <button
                          type="button"
                          class="btn-sm"
                          [disabled]="exiting()"
                          (click)="askExit(v)"
                        >
                          Dar salida
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="empty">Nadie dentro en este momento.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="card">
            <h3>Ingresos de hoy</h3>
            <table>
              <thead>
                <tr>
                  <th>Visitante</th>
                  <th>Entrada</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (v of d.today; track v.id) {
                  <tr>
                    <td>
                      <strong>{{ v.displayName }}</strong>
                      @if (v.visitReason) {
                        <div class="meta">{{ v.visitReason }}</div>
                      }
                    </td>
                    <td>{{ v.entryAt | date: 'shortTime' }}</td>
                    <td>
                      <span class="badge" [class.inside]="v.isInside">
                        {{ v.isInside ? 'Dentro' : 'Salió' }}
                      </span>
                    </td>
                    <td class="actions">
                      @if (v.isInside && auth.hasPermission('reception.exit')) {
                        <button
                          type="button"
                          class="btn-sm"
                          [disabled]="exiting()"
                          (click)="askExit(v)"
                        >
                          Dar salida
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="empty">Sin ingresos hoy.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="!!pendingExit()"
        title="Dar salida"
        [message]="
          pendingExit()
            ? '¿Registrar la salida de ' + pendingExit()!.displayName + '?'
            : ''
        "
        detail="Permanecerás en el panel para continuar con otros visitantes."
        confirmLabel="Sí, dar salida"
        [busy]="exiting()"
        busyLabel="Registrando…"
        [danger]="true"
        (confirmed)="confirmExit()"
        (cancelled)="closeExit()"
      />
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
    .head p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; max-width: 36rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      background: var(--primary);
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      padding: 0.9rem 1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 12px;
      background: var(--coraza-surface);
    }
    .kpi strong { font-size: 1.6rem; color: var(--primary-dark); line-height: 1; }
    .kpi span { font-size: 0.78rem; color: var(--text-secondary); }
    .kpi.warn { background: color-mix(in srgb, #f59e0b 10%, var(--surface)); border-color: #fde68a; }
    .kpi.warn strong { color: #b45309; }
    .kpi.muted strong { color: var(--neutral-600); }
    .chart-card, .card {
      padding: 1rem 1.1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 12px;
      background: var(--coraza-surface);
    }
    .chart-card h3, .card h3 {
      margin: 0 0 0.85rem;
      font-size: 0.95rem;
      color: var(--primary-dark);
    }
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 0.35rem;
      height: 120px;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 0.25rem;
    }
    .bar {
      width: 100%;
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      background: color-mix(in srgb, var(--primary) 75%, #93c5fd);
    }
    .bar-label { font-size: 0.65rem; color: var(--text-muted); }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td {
      text-align: left;
      padding: 0.55rem 0.35rem;
      border-bottom: 1px solid var(--coraza-border);
      vertical-align: top;
    }
    th {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--text-secondary);
    }
    .meta { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.15rem; }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--neutral-100);
      color: var(--neutral-600);
    }
    .badge.inside { background: color-mix(in srgb, #16a34a 12%, var(--surface)); color: #15803d; }
    .actions { text-align: right; white-space: nowrap; }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, #dc2626 35%, #fecaca);
      background: color-mix(in srgb, #dc2626 8%, var(--surface));
      color: #b91c1c;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }
    .empty { color: var(--text-secondary); }
    .error { color: var(--coraza-error); }
  `,
})
export class ReceptionPanel implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ReceptionApiService);
  private readonly toast = inject(ToastService);

  readonly data = signal<ReceptionDashboard | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingExit = signal<ReceptionVisitor | null>(null);
  readonly exiting = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  barHeight(entries: number, d: ReceptionDashboard): number {
    const max = Math.max(1, ...d.last14Days.map((x) => x.entries));
    return Math.max(4, Math.round((entries / max) * 100));
  }

  askExit(v: ReceptionVisitor): void {
    this.pendingExit.set(v);
  }

  closeExit(): void {
    if (this.exiting()) return;
    this.pendingExit.set(null);
  }

  confirmExit(): void {
    const v = this.pendingExit();
    if (!v || this.exiting()) return;
    this.exiting.set(true);
    this.api.registerExit(v.id).subscribe({
      next: (saved) => {
        this.applyLocalExit(saved);
        this.exiting.set(false);
        this.pendingExit.set(null);
        const hora = saved.exitAt
          ? new Date(saved.exitAt).toLocaleTimeString('es-CO', { timeStyle: 'short' })
          : '';
        this.toast.success(
          'Salida registrada',
          hora ? `${saved.displayName} · ${hora}` : saved.displayName,
        );
      },
      error: (err) => {
        this.exiting.set(false);
        this.toast.error(err?.error?.message ?? 'No se pudo registrar la salida');
      },
    });
  }

  /** Actualiza KPIs/listas en memoria: evita reconsultar todo el dashboard. */
  private applyLocalExit(saved: ReceptionVisitor): void {
    const current = this.data();
    if (!current) return;
    const wasTodayInside = current.today.some((row) => row.id === saved.id && row.isInside);
    this.data.set({
      ...current,
      stats: {
        ...current.stats,
        insideNow: Math.max(0, current.stats.insideNow - 1),
        todayStillInside: wasTodayInside
          ? Math.max(0, current.stats.todayStillInside - 1)
          : current.stats.todayStillInside,
      },
      insideNow: current.insideNow.filter((row) => row.id !== saved.id),
      today: current.today.map((row) => (row.id === saved.id ? { ...saved } : row)),
    });
  }

  private reload(): void {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el panel de recepción');
      },
    });
  }
}
