import { DatePipe, SlicePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

export interface AuditMovementRow {
  id: string;
  userId: string | null;
  userName: string | null;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface MovementsResponse {
  items: AuditMovementRow[];
  total: number;
  page: number;
  limit: number;
}

const MODULE_LABELS: Record<string, string> = {
  auth: 'Acceso',
  users: 'Usuarios',
  hr: 'Gestión humana',
  reception: 'Recepción',
  deliveries: 'Dotación / entregas',
  inventory: 'Almacén',
  post_equipment: 'Equipos de puesto',
  posts: 'Puestos',
  scheduling: 'Programación',
  documental: 'Documental',
  audit: 'Auditoría',
};

@Component({
  selector: 'app-admin-audit-movements',
  imports: [FormsModule, DatePipe, SlicePipe],
  template: `
    <section class="mov">
      <header class="mov__head">
        <div>
          <h2>Historial de movimientos</h2>
          <p>
            Seguimiento de acciones del portal (login, usuarios, personal, visitas, almacén,
            entregas, etc.). Solo Auditor y Gerencia (<code>audit.view</code>).
          </p>
        </div>
      </header>

      <form class="mov__filters" (ngSubmit)="load(1)">
        <label>
          Módulo
          <select [(ngModel)]="filters.module" name="module">
            <option value="">Todos</option>
            @for (m of moduleOptions; track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>
        </label>
        <label>
          Acción (texto)
          <input [(ngModel)]="filters.action" name="action" placeholder="login, create, checkout…" />
        </label>
        <label>
          Desde
          <input type="date" [(ngModel)]="filters.from" name="from" />
        </label>
        <label>
          Hasta
          <input type="date" [(ngModel)]="filters.to" name="to" />
        </label>
        <button type="submit" class="btn" [disabled]="loading()">Filtrar</button>
      </form>

      @if (error()) {
        <p class="mov__error">{{ error() }}</p>
      }

      <div class="mov__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Módulo</th>
              <th>Acción</th>
              <th>Entidad</th>
              <th>Detalle</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="7" class="muted">Cargando…</td>
              </tr>
            } @else {
              @for (row of items(); track row.id) {
                <tr>
                  <td class="nowrap">{{ row.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td>{{ row.userName || row.userId || '—' }}</td>
                  <td>{{ moduleLabel(row.module) }}</td>
                  <td><span class="badge">{{ row.action }}</span></td>
                  <td class="mono">
                    @if (row.entityType) {
                      {{ row.entityType }}
                      @if (row.entityId) {
                        <span class="muted"> · {{ row.entityId | slice: 0:8 }}…</span>
                      }
                    } @else {
                      —
                    }
                  </td>
                  <td class="detail">{{ detailPreview(row) }}</td>
                  <td class="mono">{{ row.ipAddress || '—' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="muted">Sin movimientos con estos filtros.</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <footer class="mov__pager">
        <span class="muted">{{ total() }} registro(s)</span>
        <div>
          <button type="button" class="btn ghost" [disabled]="page() <= 1 || loading()" (click)="load(page() - 1)">
            Anterior
          </button>
          <span>Pág. {{ page() }}</span>
          <button
            type="button"
            class="btn ghost"
            [disabled]="page() * limit() >= total() || loading()"
            (click)="load(page() + 1)"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  `,
  styles: `
    .mov { display: flex; flex-direction: column; gap: 1rem; }
    .mov__head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .mov__head p { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; max-width: 52rem; }
    .mov__filters {
      display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;
    }
    .mov__filters label {
      display: flex; flex-direction: column; gap: 0.25rem;
      font-size: 0.75rem; color: var(--text-muted, #6b7280);
    }
    .mov__filters input, .mov__filters select {
      min-width: 9rem; padding: 0.4rem 0.55rem; border-radius: 8px;
      border: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff);
    }
    .btn {
      padding: 0.45rem 0.9rem; border-radius: 8px; border: none;
      background: var(--coraza-primary, #1d4ed8); color: #fff; cursor: pointer; font-size: 0.875rem;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.ghost {
      background: transparent; color: var(--text, #111); border: 1px solid var(--border, #e5e7eb);
    }
    .mov__error { color: var(--coraza-error, #b91c1c); margin: 0; }
    .mov__table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.65rem; text-align: left; border-bottom: 1px solid var(--border, #f3f4f6); vertical-align: top; }
    th { background: var(--surface-2, #f9fafb); font-weight: 600; white-space: nowrap; }
    .nowrap { white-space: nowrap; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.8rem; }
    .muted { color: var(--text-muted, #6b7280); }
    .badge {
      display: inline-block; padding: 0.1rem 0.4rem; border-radius: 6px;
      background: #eff6ff; color: #1d4ed8; font-size: 0.75rem;
    }
    .detail { max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted, #6b7280); }
    .mov__pager { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .mov__pager > div { display: flex; align-items: center; gap: 0.5rem; }
  `,
})
export class AdminAuditMovements implements OnInit {
  private readonly http = inject(HttpClient);

  readonly items = signal<AuditMovementRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(50);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  filters = { module: '', action: '', from: '', to: '' };

  readonly moduleOptions = Object.entries(MODULE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  ngOnInit(): void {
    this.load(1);
  }

  moduleLabel(code: string): string {
    return MODULE_LABELS[code] || code;
  }

  detailPreview(row: AuditMovementRow): string {
    const src = row.newValue ?? row.oldValue;
    if (!src || typeof src !== 'object') return '—';
    try {
      const s = JSON.stringify(src);
      return s.length > 80 ? s.slice(0, 80) + '…' : s;
    } catch {
      return '—';
    }
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(this.limit()));
    if (this.filters.module) params = params.set('module', this.filters.module);
    if (this.filters.action.trim()) params = params.set('action', this.filters.action.trim());
    if (this.filters.from) params = params.set('from', this.filters.from);
    if (this.filters.to) params = params.set('to', this.filters.to);

    this.http
      .get<MovementsResponse>(`${environment.apiUrl}/audit/movements`, { params })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.limit.set(res.limit);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el historial. Verifica permiso audit.view.');
          this.loading.set(false);
        },
      });
  }
}
