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
}

interface BoardPayload {
  date: string;
  slot: string;
  total: number;
  filled: number;
  rows: BoardRow[];
}

const SLOTS = [
  '01:00',
  '03:00',
  '04:20',
  '07:00',
  '09:00',
  '11:00',
  '13:00',
  '15:00',
  '19:00',
  '21:00',
  '23:00',
];

const STATUSES: Status[] = ['S/N', 'N/C', 'N/A', 'C/N'];

@Component({
  selector: 'app-radio-control-page',
  imports: [CommonModule, FormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Control"
        subtitle="Reporte de radio (orden Excel) · independiente de puestos del portal"
      />

      <div class="hr-filters rc-filters">
        <label>
          Fecha
          <input type="date" [(ngModel)]="date" (ngModelChange)="reload()" />
        </label>
        <label>
          Franja
          <select [(ngModel)]="slot" (ngModelChange)="reload()">
            @for (s of slots; track s) {
              <option [value]="s">{{ s }}</option>
            }
          </select>
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
        <button
          type="button"
          class="hr-btn"
          [disabled]="busy() || !board() || !canEdit()"
          (click)="fillPendingSn()"
        >
          Marcar pendientes S/N
        </button>
        <button
          type="button"
          class="hr-btn hr-btn-primary rc-save-next"
          [disabled]="busy() || !board() || !canEdit()"
          (click)="saveAndNextSlot()"
        >
          Guardar y siguiente franja
        </button>
      </div>

      <section class="rc-minuta">
        <h4>Minuta virtual · Control Coraza</h4>
        <p class="hr-muted">La misma minuta de los vigilantes, con la sesión de Control.</p>
        <iframe
          class="rc-minuta-frame"
          title="Minuta virtual Control Coraza"
          src="https://portalcoraza-minuta.onrender.com/?embed=1"
        ></iframe>
      </section>

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
    </div>
  `,
  styles: `
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
    .rc-save-next {
      font-weight: 700;
      white-space: nowrap;
    }
    .rc-table-wrap {
      overflow: auto;
      max-height: calc(100vh - 220px);
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
    .rc-minuta {
      margin: 0 0 1rem;
      padding: 0.9rem 1rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #fff;
    }
    .rc-minuta h4 {
      margin: 0 0 0.2rem;
    }
    .rc-minuta-frame {
      display: block;
      width: 100%;
      height: 720px;
      margin-top: 0.6rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
    }
  `,
})
export class RadioControlPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly slots = SLOTS;
  readonly statuses = STATUSES;

  date = new Date().toISOString().slice(0, 10);
  slot = this.nearestSlot();
  q = '';

  readonly board = signal<BoardPayload | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly savingId = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
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
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onMinutaReady);
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.reload(), 250);
  }

  reload(): void {
    this.loading.set(true);
    const params: Record<string, string> = { date: this.date, slot: this.slot };
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
      .put(`${environment.apiUrl}/radio-control/check`, {
        rosterId: row.rosterId,
        date: this.date,
        slot: this.slot,
        status,
      })
      .subscribe({
        next: () => {
          row.status = status;
          const b = this.board();
          if (b) {
            this.board.set({
              ...b,
              filled: b.rows.filter((r) => r.status).length,
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
      this.toast.info('No hay pendientes en esta franja');
      return;
    }
    this.busy.set(true);
    this.http
      .post(`${environment.apiUrl}/radio-control/fill`, {
        date: this.date,
        slot: this.slot,
        status: 'S/N',
        rosterIds: pending,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success(`${pending.length} radios marcados S/N`);
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo marcar');
        },
      });
  }

  saveAndNextSlot(): void {
    const b = this.board();
    if (!b || !this.canEdit()) return;
    const fromSlot = this.slot;
    const pending = b.rows.filter((r) => !r.status).map((r) => r.rosterId);

    const advance = () => {
      const idx = SLOTS.indexOf(this.slot as (typeof SLOTS)[number]);
      if (idx < 0 || idx >= SLOTS.length - 1) {
        const d = new Date(this.date + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        this.date = d.toISOString().slice(0, 10);
        this.slot = SLOTS[0];
        this.toast.success(`Franja ${fromSlot} guardada · día siguiente ${this.slot}`);
      } else {
        this.slot = SLOTS[idx + 1];
        this.toast.success(`Franja ${fromSlot} guardada · pasando a ${this.slot}`);
      }
      this.reload();
    };

    if (pending.length === 0) {
      advance();
      return;
    }

    this.busy.set(true);
    this.http
      .post(`${environment.apiUrl}/radio-control/fill`, {
        date: this.date,
        slot: this.slot,
        status: 'S/N',
        rosterIds: pending,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          advance();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo guardar la franja');
        },
      });
  }

  private readonly onMinutaReady = (ev: MessageEvent) => {
    if (ev.origin !== 'https://portalcoraza-minuta.onrender.com') return;
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
        'https://portalcoraza-minuta.onrender.com',
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

  private nearestSlot(): string {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    let best = SLOTS[0];
    let bestDiff = Infinity;
    for (const s of SLOTS) {
      const [h, m] = s.split(':').map(Number);
      const diff = Math.abs(h * 60 + m - mins);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
    return best;
  }
}
