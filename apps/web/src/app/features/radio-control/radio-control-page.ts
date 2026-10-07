import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { HrPageHeader } from '../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../shared/services/toast.service';

type Status = 'S/N' | 'N/C' | 'N/A' | 'C/N';

interface BoardRow {
  rosterId: string;
  sortOrder: number;
  callsign: string | null;
  label: string;
  status: Status | null;
  notes: string | null;
  checkedAt: string | null;
  checkedTime: string | null;
  checksToday: number;
}

interface BoardPayload {
  date: string;
  total: number;
  filled: number;
  rows: BoardRow[];
}

const STATUSES: Status[] = ['S/N', 'N/C', 'N/A', 'C/N'];
const MINUTA_ORIGIN = 'https://portalcoraza-minuta.onrender.com';

@Component({
  selector: 'app-radio-control-page',
  imports: [CommonModule, FormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Control Coraza"
        subtitle="Minuta virtual y reporte de radio · la hora se toma del equipo al marcar"
      />

      <nav class="hr-tabs rc-tabs">
        <button type="button" class="hr-tab" [class.active]="panel() === 'minuta'" (click)="panel.set('minuta')">
          Minuta virtual
        </button>
        <button type="button" class="hr-tab" [class.active]="panel() === 'radio'" (click)="panel.set('radio')">
          Control de radio
        </button>
      </nav>

      <section class="rc-pane" [class.active]="panel() === 'minuta'">
        <iframe
          class="rc-minuta-frame"
          title="Minuta virtual Control Coraza"
          src="https://portalcoraza-minuta.onrender.com/?embed=1"
        ></iframe>
      </section>

      <section class="rc-pane" [class.active]="panel() === 'radio'">
        <div class="hr-filters rc-filters">
          <label>
            Fecha
            <input type="date" [(ngModel)]="date" (ngModelChange)="reload()" />
          </label>
          <label class="rc-grow">
            Buscar
            <input
              type="search"
              placeholder="Indicativo o nombre"
              [(ngModel)]="q"
              (ngModelChange)="onSearch()"
            />
          </label>
          @if (board(); as b) {
            <div class="rc-progress">{{ b.filled }} / {{ b.total }}</div>
          }
          <div class="rc-clock" title="Hora del equipo">Ahora: {{ clock() }}</div>
          <button
            type="button"
            class="hr-btn hr-btn-primary"
            [disabled]="busy() || !board() || !canEdit()"
            (click)="fillPendingSn()"
          >
            Marcar pendientes S/N (hora actual)
          </button>
        </div>

        @if (loading()) {
          <p class="hr-muted">Cargando…</p>
        } @else if (board(); as b) {
          <div class="rc-table-wrap">
            <table class="hr-table rc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Indicativo</th>
                  <th>Puesto (radio)</th>
                  <th>Última hora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (row of b.rows; track row.rosterId) {
                  <tr [class.rc-done]="!!row.status">
                    <td>{{ row.sortOrder }}</td>
                    <td>{{ row.callsign || '—' }}</td>
                    <td>
                      <strong>{{ row.label }}</strong>
                      @if (row.checksToday > 1) {
                        <div class="hr-muted">{{ row.checksToday }} marcajes hoy</div>
                      }
                    </td>
                    <td>
                      @if (row.checkedTime) {
                        <strong>{{ row.checkedTime }}</strong>
                      } @else {
                        <span class="hr-muted">—</span>
                      }
                    </td>
                    <td>
                      <div class="rc-status">
                        @for (st of statuses; track st) {
                          <button
                            type="button"
                            class="rc-chip"
                            [class.active]="row.status === st"
                            [attr.data-st]="st"
                            [disabled]="!canEdit() || savingId() === row.rosterId"
                            (click)="setStatus(row, st)"
                          >
                            {{ st }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .rc-tabs {
      margin-bottom: 1rem;
    }
    .rc-pane {
      display: none;
    }
    .rc-pane.active {
      display: block;
    }
    .rc-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
    }
    .rc-filters label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
    }
    .rc-grow {
      flex: 1;
      min-width: 180px;
    }
    .rc-progress {
      font-weight: 600;
      padding: 0.5rem 0.75rem;
      background: #f1f5f9;
      border-radius: 8px;
    }
    .rc-clock {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      padding: 0.5rem 0.75rem;
      background: #ecfeff;
      border: 1px solid #a5f3fc;
      border-radius: 8px;
    }
    .rc-table-wrap {
      overflow: auto;
      max-height: calc(100vh - 260px);
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .rc-table th {
      position: sticky;
      top: 0;
      background: #fff;
      z-index: 1;
    }
    .rc-status {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .rc-chip {
      border: 1px solid #cbd5e1;
      background: #fff;
      border-radius: 6px;
      padding: 0.2rem 0.45rem;
      font-size: 0.75rem;
      cursor: pointer;
    }
    .rc-chip.active {
      color: #fff;
      font-weight: 700;
    }
    .rc-chip.active[data-st='S/N'] {
      background: #15803d;
      border-color: #14532d;
    }
    .rc-chip.active[data-st='N/C'] {
      background: #dc2626;
      border-color: #991b1b;
    }
    .rc-chip.active[data-st='N/A'] {
      background: #334155;
      border-color: #0f172a;
    }
    .rc-chip.active[data-st='C/N'] {
      background: #ea580c;
      border-color: #9a3412;
    }
    .rc-done td {
      background: #f8fafc;
    }
    .rc-minuta-frame {
      display: block;
      width: 100%;
      height: calc(100vh - 210px);
      min-height: 560px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
    }
  `,
})
export class RadioControlPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly panel = signal<'minuta' | 'radio'>('minuta');
  readonly statuses = STATUSES;

  date = this.localDateYmd();
  q = '';

  readonly board = signal<BoardPayload | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly savingId = signal<string | null>(null);
  readonly clock = signal(this.localHm());

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private minutaSession: Promise<void> | null = null;

  canEdit(): boolean {
    return (
      this.auth.hasPermission('radio_control.edit') ||
      this.auth.hasPermission('radio_control.view') ||
      this.auth.hasPermission('operations.view')
    );
  }

  ngOnInit(): void {
    window.addEventListener('message', this.onMinutaReady);
    this.reload();
    this.clockTimer = setInterval(() => this.clock.set(this.localHm()), 1000);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMinutaReady);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 250);
  }

  reload(): void {
    this.loading.set(true);
    const params: Record<string, string> = { date: this.date };
    if (this.q.trim()) params['q'] = this.q.trim();
    this.http
      .get<BoardPayload>(`${environment.apiUrl}/radio-control/board`, { params })
      .subscribe({
        next: (b) => {
          this.board.set(b);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.toast.error(e?.error?.message || 'No se pudo cargar el tablero');
        },
      });
  }

  setStatus(row: BoardRow, status: Status): void {
    if (!this.canEdit()) return;
    this.savingId.set(row.rosterId);
    this.http
      .put<{ checkedTime?: string; checkedAt?: string }>(
        `${environment.apiUrl}/radio-control/check`,
        {
          rosterId: row.rosterId,
          date: this.date,
          status,
          checkedAt: new Date().toISOString(),
        },
      )
      .subscribe({
        next: (res) => {
          const wasEmpty = !row.status;
          row.status = status;
          row.checkedTime = res.checkedTime || this.localHm();
          row.checkedAt = res.checkedAt || new Date().toISOString();
          row.checksToday = (row.checksToday || 0) + 1;
          const b = this.board();
          if (b) {
            this.board.set({
              ...b,
              filled: wasEmpty ? b.filled + 1 : b.filled,
            });
          }
          this.savingId.set(null);
        },
        error: (e) => {
          this.savingId.set(null);
          this.toast.error(e?.error?.message || 'No se pudo guardar');
        },
      });
  }

  fillPendingSn(): void {
    const b = this.board();
    if (!b || !this.canEdit()) return;
    const pending = b.rows.filter((r) => !r.status).map((r) => r.rosterId);
    if (pending.length === 0) {
      this.toast.info('No hay pendientes sin marcar hoy');
      return;
    }
    this.busy.set(true);
    this.http
      .post(`${environment.apiUrl}/radio-control/fill`, {
        date: this.date,
        status: 'S/N',
        checkedAt: new Date().toISOString(),
        rosterIds: pending,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success(`${pending.length} radios marcados S/N a las ${this.localHm()}`);
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo marcar');
        },
      });
  }

  private localDateYmd(): string {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private localHm(): string {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  private readonly onMinutaReady = (ev: MessageEvent) => {
    if (ev.origin !== MINUTA_ORIGIN) return;
    if (ev.data?.type !== 'coraza-minuta-ready') return;
    const target = ev.source;
    if (!target || !('postMessage' in target)) return;
    void this.portalSession().then(() => {
      const user = this.auth.currentUser();
      (target as Window).postMessage(
        {
          type: 'coraza-minuta-session',
          accessToken: this.auth.getAccessToken(),
          refreshToken: localStorage.getItem('coraza_refresh'),
          user,
          tenantId: user?.tenantId || localStorage.getItem('coraza_tenant_id'),
        },
        MINUTA_ORIGIN,
      );
    });
  };

  private portalSession(): Promise<void> {
    if (!this.minutaSession) {
      this.minutaSession = new Promise((resolve) => {
        this.auth.refreshSession().subscribe({ next: () => resolve(), error: () => resolve() });
      });
    }
    return this.minutaSession;
  }
}
