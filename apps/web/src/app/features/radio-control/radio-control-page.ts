import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { HrPageHeader } from '../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../shared/services/toast.service';

type Status = 'S/N' | 'N/C' | 'N/A' | 'C/N';

interface PassInfo {
  id: string;
  passNumber: number;
  openedAt: string;
  closedAt: string | null;
  open: boolean;
  openedTime: string;
  closedTime: string | null;
  marked?: number;
  total?: number;
}

interface BoardRow {
  rosterId: string;
  sortOrder: number;
  callsign: string | null;
  label: string;
  status: Status | null;
  notes: string | null;
  checkedAt: string | null;
  checkedTime: string | null;
}

interface BoardPayload {
  date: string;
  pass: PassInfo;
  total: number;
  filled: number;
  rows: BoardRow[];
}

interface HistoryPayload {
  date: string;
  passes: PassInfo[];
}

interface PassDetailPayload {
  pass: PassInfo & { date: string };
  rows: Array<{
    sortOrder: number;
    callsign: string | null;
    label: string;
    status: string;
    notes: string | null;
    checkedTime: string;
    /** Todas las marcas del radio en la pasada, en orden de hora. */
    marks?: Array<{ time: string; status: string }>;
    checkedAt: string;
  }>;
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
        subtitle="Marca cada radio con la hora del equipo · al terminar guarda y abre la siguiente pasada"
      />

      <nav class="hr-tabs rc-tabs">
        <button type="button" class="hr-tab" [class.active]="panel() === 'minuta'" (click)="panel.set('minuta')">
          Minuta virtual
        </button>
        <button type="button" class="hr-tab" [class.active]="panel() === 'radio'" (click)="goRadio()">
          Control de radio
        </button>
        <button type="button" class="hr-tab" [class.active]="panel() === 'historial'" (click)="goHistory()">
          Historial
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
            <input type="date" [(ngModel)]="date" (ngModelChange)="onDateChange()" />
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
            <div class="rc-pass">
              Pasada #{{ b.pass.passNumber }} · abierta {{ b.pass.openedTime }}
            </div>
            <div class="rc-progress">{{ b.filled }} / {{ b.total }}</div>
          }
          <div class="rc-clock">Ahora: {{ clock() }}</div>
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
            (click)="saveAndNextPass()"
          >
            Guardar y siguiente pasada
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
                  <th>Hora marcada</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                @for (row of b.rows; track row.rosterId) {
                  <tr [class.rc-done]="!!row.status">
                    <td>{{ row.sortOrder }}</td>
                    <td>{{ row.callsign || '—' }}</td>
                    <td><strong>{{ row.label }}</strong></td>
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
                    <td>
                      <input
                        class="rc-notes"
                        type="text"
                        maxlength="500"
                        placeholder="Novedad (opcional)"
                        [(ngModel)]="row.notes"
                        [disabled]="!canEdit() || savingId() === row.rosterId"
                        (blur)="saveNotes(row)"
                        (keydown.enter)="$any($event.target).blur()"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      <section class="rc-pane" [class.active]="panel() === 'historial'">
        <div class="hr-filters rc-filters">
          <label>
            Fecha
            <input type="date" [(ngModel)]="date" (ngModelChange)="loadHistory()" />
          </label>
        </div>

        @if (historyLoading()) {
          <p class="hr-muted">Cargando historial…</p>
        } @else if (history(); as h) {
          @if (h.passes.length === 0) {
            <p class="hr-muted">No hay pasadas registradas en esta fecha.</p>
          } @else {
            <div class="rc-history-list">
              @for (p of h.passes; track p.id) {
                <button type="button" class="rc-history-card" (click)="openPass(p.id)">
                  <div class="rc-history-card__title">
                    Pasada #{{ p.passNumber }}
                    @if (p.open) {
                      <span class="rc-badge open">Abierta</span>
                    } @else {
                      <span class="rc-badge">Cerrada</span>
                    }
                  </div>
                  <div class="hr-muted">
                    {{ p.openedTime }}
                    @if (p.closedTime) {
                      → {{ p.closedTime }}
                    }
                    · {{ p.marked ?? 0 }}/{{ p.total ?? '—' }} radios
                  </div>
                </button>
              }
            </div>
          }
        }

        @if (passDetail(); as detail) {
          <div class="rc-pass-detail">
            <h3>
              Detalle pasada #{{ detail.pass.passNumber }}
              <button type="button" class="hr-btn" (click)="passDetail.set(null)">Cerrar</button>
            </h3>
            <div class="rc-table-wrap rc-table-wrap--short">
              <table class="hr-table rc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Indicativo</th>
                    <th>Puesto</th>
                    <th>Hora</th>
                    <th>Estado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of detail.rows; track row.sortOrder + row.label) {
                    <tr>
                      <td>{{ row.sortOrder }}</td>
                      <td>{{ row.callsign || '—' }}</td>
                      <td>{{ row.label }}</td>
                      <td>
                        @for (m of row.marks?.length ? row.marks : [{ time: row.checkedTime, status: row.status }]; track $index) {
                          <div><strong>{{ m.time }}</strong> <span class="hr-muted">{{ m.status }}</span></div>
                        }
                      </td>
                      <td>{{ row.status }}</td>
                      <td>{{ row.notes || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .rc-tabs { margin-bottom: 1rem; }
    .rc-pane { display: none; }
    .rc-pane.active { display: block; }
    .rc-filters {
      display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; margin-bottom: 1rem;
    }
    .rc-filters label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; }
    .rc-grow { flex: 1; min-width: 160px; }
    .rc-progress, .rc-pass, .rc-clock {
      font-weight: 600; padding: 0.5rem 0.75rem; border-radius: 8px; background: #f1f5f9;
    }
    .rc-clock { background: #ecfeff; border: 1px solid #a5f3fc; }
    .rc-pass { background: #eef2ff; border: 1px solid #c7d2fe; }
    .rc-save-next { font-weight: 700; white-space: nowrap; }
    .rc-table-wrap {
      overflow: auto; max-height: calc(100vh - 280px);
      border: 1px solid #e2e8f0; border-radius: 10px;
    }
    .rc-table-wrap--short { max-height: 420px; margin-top: 0.75rem; }
    .rc-table th { position: sticky; top: 0; background: #fff; z-index: 1; }
    .rc-status { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .rc-chip {
      border: 1px solid #cbd5e1; background: #fff; border-radius: 6px;
      padding: 0.2rem 0.45rem; font-size: 0.75rem; cursor: pointer;
    }
    .rc-chip.active { color: #fff; font-weight: 700; }
    .rc-chip.active[data-st='S/N'] { background: #15803d; border-color: #14532d; }
    .rc-chip.active[data-st='N/C'] { background: #dc2626; border-color: #991b1b; }
    .rc-chip.active[data-st='N/A'] { background: #334155; border-color: #0f172a; }
    .rc-chip.active[data-st='C/N'] { background: #ea580c; border-color: #9a3412; }
    .rc-done td { background: #f8fafc; }
    .rc-notes {
      width: 100%; min-width: 160px; max-width: 280px;
      border: 1px solid #cbd5e1; border-radius: 6px;
      padding: 0.35rem 0.5rem; font-size: 0.8rem;
    }
    .rc-notes:disabled { background: #f8fafc; }
    .rc-minuta-frame {
      display: block; width: 100%; height: calc(100vh - 210px); min-height: 560px;
      border: 1px solid #e2e8f0; border-radius: 10px; background: #fff;
    }
    .rc-history-list { display: grid; gap: 0.5rem; }
    .rc-history-card {
      text-align: left; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 0.75rem 1rem; background: #fff; cursor: pointer;
    }
    .rc-history-card:hover { border-color: #94a3b8; }
    .rc-history-card__title { display: flex; gap: 0.5rem; align-items: center; font-weight: 700; }
    .rc-badge {
      font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 999px;
      background: #e2e8f0; font-weight: 600;
    }
    .rc-badge.open { background: #dcfce7; color: #166534; }
    .rc-pass-detail { margin-top: 1.25rem; }
    .rc-pass-detail h3 {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
      font-size: 1rem; margin: 0;
    }
  `,
})
export class RadioControlPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly panel = signal<'minuta' | 'radio' | 'historial'>('minuta');
  readonly statuses = STATUSES;

  date = this.localDateYmd();
  q = '';

  readonly board = signal<BoardPayload | null>(null);
  readonly history = signal<HistoryPayload | null>(null);
  readonly passDetail = signal<PassDetailPayload | null>(null);
  readonly loading = signal(false);
  readonly historyLoading = signal(false);
  readonly busy = signal(false);
  readonly savingId = signal<string | null>(null);
  readonly clock = signal(this.localHm());

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private minutaSession: Promise<void> | null = null;
  /** Última observación persistida por radio (evita re-guardar al blur). */
  private notesSaved = new Map<string, string | null>();

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

  goRadio(): void {
    this.panel.set('radio');
    this.reload();
  }

  goHistory(): void {
    this.panel.set('historial');
    this.loadHistory();
  }

  onDateChange(): void {
    this.passDetail.set(null);
    if (this.panel() === 'historial') this.loadHistory();
    else this.reload();
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
          this.notesSaved.clear();
          for (const r of b.rows) this.notesSaved.set(r.rosterId, r.notes ?? null);
          this.board.set(b);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.toast.error(e?.error?.message || 'No se pudo cargar el tablero');
        },
      });
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    this.passDetail.set(null);
    this.http
      .get<HistoryPayload>(`${environment.apiUrl}/radio-control/history`, {
        params: { date: this.date },
      })
      .subscribe({
        next: (h) => {
          this.history.set(h);
          this.historyLoading.set(false);
        },
        error: (e) => {
          this.historyLoading.set(false);
          this.toast.error(e?.error?.message || 'No se pudo cargar el historial');
        },
      });
  }

  openPass(id: string): void {
    this.http
      .get<PassDetailPayload>(`${environment.apiUrl}/radio-control/passes/${id}`)
      .subscribe({
        next: (d) => {
          this.passDetail.set(d);
          // El detalle sale debajo de la lista: llevarlo a la vista para que se note que abrió.
          setTimeout(() =>
            document.querySelector('.rc-pass-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          );
        },
        error: (e) => this.toast.error(e?.error?.message || 'No se pudo abrir la pasada'),
      });
  }

  setStatus(row: BoardRow, status: Status): void {
    if (!this.canEdit()) return;
    this.persistCheck(row, status, new Date().toISOString());
  }

  /** Guarda observación sin cambiar la hora ya marcada (si aún no hay estado, viaja al marcar). */
  saveNotes(row: BoardRow): void {
    if (!this.canEdit() || !row.status) return;
    const notes = (row.notes || '').trim() || null;
    row.notes = notes;
    if (notes === (this.notesSaved.get(row.rosterId) ?? null)) return;
    this.persistCheck(row, row.status, row.checkedAt || new Date().toISOString());
  }

  private persistCheck(row: BoardRow, status: Status, checkedAt: string): void {
    this.savingId.set(row.rosterId);
    const notes = (row.notes || '').trim() || null;
    this.http
      .put<{ checkedTime?: string; checkedAt?: string; notes?: string | null }>(
        `${environment.apiUrl}/radio-control/check`,
        {
          rosterId: row.rosterId,
          date: this.date,
          status,
          notes,
          checkedAt,
        },
      )
      .subscribe({
        next: (res) => {
          const wasEmpty = !row.status;
          row.status = status;
          row.notes = notes;
          this.notesSaved.set(row.rosterId, notes);
          row.checkedTime = res.checkedTime || this.localHm();
          row.checkedAt = res.checkedAt || checkedAt;
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
      this.toast.info('No hay pendientes en esta pasada');
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
          this.toast.success(`${pending.length} radios S/N a las ${this.localHm()}`);
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo marcar');
        },
      });
  }

  /** Cierra la pasada actual (completa pendientes S/N) y abre tabla limpia. */
  saveAndNextPass(): void {
    if (!this.canEdit()) return;
    this.busy.set(true);
    this.http
      .post<{ closed: PassInfo; open: PassInfo }>(`${environment.apiUrl}/radio-control/next-pass`, {
        date: this.date,
        checkedAt: new Date().toISOString(),
        fillPendingSn: true,
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.toast.success(
            `Pasada #${res.closed.passNumber} guardada · abierta pasada #${res.open.passNumber}`,
          );
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo cerrar la pasada');
        },
      });
  }

  private localDateYmd(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
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
