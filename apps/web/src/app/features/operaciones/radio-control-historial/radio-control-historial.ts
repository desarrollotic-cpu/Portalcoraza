import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../shared/services/toast.service';

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
    checkedAt: string;
  }>;
}

@Component({
  selector: 'app-radio-control-historial',
  imports: [CommonModule, FormsModule, HrPageHeader, RouterLink],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Historial control de radio"
        subtitle="Consulta pasadas cerradas y abiertas por fecha · el marcado se hace en Control"
      />

      <p class="rch-link">
        Ir a
        <a routerLink="/control">Control de radio</a>
        para marcar la pasada actual.
      </p>

      <div class="hr-filters rch-filters">
        <label>
          Fecha
          <input type="date" [(ngModel)]="date" (ngModelChange)="loadHistory()" />
        </label>
      </div>

      @if (loading()) {
        <p class="hr-muted">Cargando historial…</p>
      } @else if (history(); as h) {
        @if (h.passes.length === 0) {
          <p class="hr-muted">No hay pasadas registradas en esta fecha.</p>
        } @else {
          <div class="rch-list">
            @for (p of h.passes; track p.id) {
              <button type="button" class="rch-card" (click)="openPass(p.id)">
                <div class="rch-card__title">
                  Pasada #{{ p.passNumber }}
                  @if (p.open) {
                    <span class="rch-badge open">Abierta</span>
                  } @else {
                    <span class="rch-badge">Cerrada</span>
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
        <div class="rch-detail">
          <h3>
            Detalle pasada #{{ detail.pass.passNumber }}
            <button type="button" class="hr-btn" (click)="passDetail.set(null)">Cerrar</button>
          </h3>
          <div class="rch-table-wrap">
            <table class="hr-table">
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
                    <td><strong>{{ row.checkedTime }}</strong></td>
                    <td>{{ row.status }}</td>
                    <td>{{ row.notes || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .rch-link { margin: 0 0 1rem; font-size: 0.9rem; color: #64748b; }
    .rch-link a { color: #1d4ed8; }
    .rch-filters {
      display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: end; margin-bottom: 1rem;
    }
    .rch-filters label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; }
    .rch-list { display: grid; gap: 0.5rem; }
    .rch-card {
      text-align: left; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 0.75rem 1rem; background: #fff; cursor: pointer;
    }
    .rch-card:hover { border-color: #94a3b8; }
    .rch-card__title { display: flex; gap: 0.5rem; align-items: center; font-weight: 700; }
    .rch-badge {
      font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 999px;
      background: #e2e8f0; font-weight: 600;
    }
    .rch-badge.open { background: #dcfce7; color: #166534; }
    .rch-detail { margin-top: 1.25rem; }
    .rch-detail h3 {
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
      font-size: 1rem; margin: 0 0 0.75rem;
    }
    .rch-table-wrap {
      overflow: auto; max-height: 420px;
      border: 1px solid #e2e8f0; border-radius: 10px;
    }
  `,
})
export class RadioControlHistorial implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  date = this.localDateYmd();
  readonly history = signal<HistoryPayload | null>(null);
  readonly passDetail = signal<PassDetailPayload | null>(null);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading.set(true);
    this.passDetail.set(null);
    this.http
      .get<HistoryPayload>(`${environment.apiUrl}/radio-control/history`, {
        params: { date: this.date },
      })
      .subscribe({
        next: (h) => {
          this.history.set(h);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.toast.error(e?.error?.message || 'No se pudo cargar el historial');
        },
      });
  }

  openPass(id: string): void {
    this.http
      .get<PassDetailPayload>(`${environment.apiUrl}/radio-control/passes/${id}`)
      .subscribe({
        next: (d) => this.passDetail.set(d),
        error: (e) => this.toast.error(e?.error?.message || 'No se pudo abrir la pasada'),
      });
  }

  private localDateYmd(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
}
