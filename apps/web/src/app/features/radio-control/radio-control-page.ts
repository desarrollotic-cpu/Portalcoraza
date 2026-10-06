import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { HrPageHeader } from '../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../shared/services/toast.service';

type Status = 'S/N' | 'N/C' | 'N/A' | 'C/N';

interface BoardRow {
  postId: string;
  code: string;
  name: string;
  zone: string | null;
  phone: string | null;
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
        subtitle="Contactos de radio por franja · estados S/N · N/C · N/A · C/N"
      >
        @if (canEdit()) {
          <button
            actions
            type="button"
            class="hr-btn hr-btn-primary"
            [disabled]="busy() || !board()"
            (click)="fillPendingSn()"
          >
            Marcar pendientes S/N
          </button>
        }
      </app-hr-page-header>

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
            placeholder="Puesto, código o zona"
            [(ngModel)]="q"
            (ngModelChange)="onSearch()"
          />
        </label>
        @if (board(); as b) {
          <div class="rc-progress">{{ b.filled }} / {{ b.total }}</div>
        }
      </div>

      @if (loading()) {
        <p class="hr-muted">Cargando…</p>
      } @else if (board(); as b) {
        <div class="rc-table-wrap">
          <table class="hr-table rc-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Puesto</th>
                <th>Código</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (row of b.rows; track row.postId) {
                <tr [class.rc-done]="!!row.status">
                  <td>{{ row.zone || '—' }}</td>
                  <td>
                    <strong>{{ row.name }}</strong>
                    @if (row.phone) {
                      <div class="hr-muted">{{ row.phone }}</div>
                    }
                  </td>
                  <td>{{ row.code }}</td>
                  <td>
                    <div class="rc-status">
                      @for (st of statuses; track st) {
                        <button
                          type="button"
                          class="rc-chip"
                          [class.active]="row.status === st"
                          [attr.data-st]="st"
                          [disabled]="!canEdit() || savingId() === row.postId"
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
    .rc-chip.active[data-st='S/N'] {
      background: #dcfce7;
      border-color: #86efac;
    }
    .rc-chip.active[data-st='N/C'] {
      background: #fee2e2;
      border-color: #fca5a5;
    }
    .rc-chip.active[data-st='N/A'] {
      background: #e2e8f0;
      border-color: #94a3b8;
    }
    .rc-chip.active[data-st='C/N'] {
      background: #ffedd5;
      border-color: #fdba74;
    }
    .rc-done td {
      background: #f8fafc;
    }
  `,
})
export class RadioControlPage implements OnInit {
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

  canEdit(): boolean {
    return this.auth.hasPermission('radio_control.edit');
  }

  ngOnInit(): void {
    this.reload();
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
    this.savingId.set(row.postId);
    this.http
      .put(`${environment.apiUrl}/radio-control/check`, {
        postId: row.postId,
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
    const pending = b.rows.filter((r) => !r.status).map((r) => r.postId);
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
        postIds: pending,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success(`${pending.length} puestos marcados S/N`);
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo marcar');
        },
      });
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
