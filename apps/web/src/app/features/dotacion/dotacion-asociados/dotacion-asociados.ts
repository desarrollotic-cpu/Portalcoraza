import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { DeliveryDialog } from '../delivery-dialog/delivery-dialog';
import { DeliveryHistory } from '../delivery-history/delivery-history';
import {
  DotacionAssociate,
  InventoryApiService,
  PaginatedDotacionAssociates,
} from '../inventory-api.service';

@Component({
  selector: 'app-dotacion-asociados',
  imports: [DatePipe, DeliveryDialog, DeliveryHistory],
  template: `
    <div class="dot-page">
      <header class="dot-dash-panel__head">
        <div>
          <h2 style="margin:0;font-size:1.1rem">Asociados</h2>
          <p class="dot-muted" style="margin:0.35rem 0 0">
            Personal ACTIVO y en VACACIONES (desde RRHH). Entregas y historial por asociado.
          </p>
        </div>
      </header>

      <div class="dot-filter-bar">
        <label>
          Buscar
          <input
            type="search"
            placeholder="Nombre, cédula o centro..."
            [value]="search()"
            (input)="onSearchInput($event)"
          />
        </label>
        <span class="dot-muted">{{ total() }} asociado(s)</span>
      </div>

      @if (loading()) {
        <div class="dot-skeleton" style="height:240px"></div>
      } @else if (error()) {
        <div class="dot-error">{{ error() }}</div>
      } @else {
        <div class="dot-dash-panel" style="padding:0">
          <div class="dot-table-wrap">
            <table class="dot-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cédula</th>
                  <th>Centro / zona</th>
                  <th>Cargo</th>
                  <th>Ingreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>{{ row.fullName }}</td>
                    <td>{{ row.documentNumber }}</td>
                    <td>{{ workCenterLabel(row) }}</td>
                    <td>{{ row.jobPositionName ?? '—' }}</td>
                    <td>{{ row.hireDate ? (row.hireDate | date: 'mediumDate') : '—' }}</td>
                    <td class="actions-cell">
                      @if (auth.hasPermission('deliveries.create')) {
                        <button type="button" class="hr-btn hr-btn-primary btn-sm" (click)="openDelivery(row)">
                          Entregar
                        </button>
                      }
                      @if (auth.hasPermission('deliveries.view')) {
                        <button type="button" class="hr-btn hr-btn-ghost btn-sm" (click)="openHistory(row)">
                          Historial
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="dot-empty">No hay asociados elegibles para dotación.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="dot-pagination">
          <button type="button" class="hr-btn hr-btn-ghost btn-sm" [disabled]="page() <= 1" (click)="goPage(page() - 1)">
            Anterior
          </button>
          <span class="dot-muted">Página {{ page() }} de {{ totalPages() }}</span>
          <button
            type="button"
            class="hr-btn hr-btn-ghost btn-sm"
            [disabled]="page() >= totalPages()"
            (click)="goPage(page() + 1)"
          >
            Siguiente
          </button>
        </div>
      }

      @if (historyOpen()) {
        <section class="dot-dash-panel history-panel">
          <header class="dot-dash-panel__head">
            <h2>Historial — {{ historySubject() }}</h2>
            <button type="button" class="hr-btn hr-btn-ghost btn-sm" (click)="closeHistory()">Cerrar</button>
          </header>
          <app-delivery-history
            [associateId]="historyAssociateId()"
            [title]="''"
          />
        </section>
      }
    </div>

    <app-delivery-dialog
      [open]="deliveryOpen()"
      [associateId]="deliveryAssociateId()"
      [subjectLabel]="deliverySubject()"
      (completed)="onDeliveryCompleted()"
      (dismissed)="closeDelivery()"
    />
  `,
  styles: `
    .actions-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .btn-sm {
      padding: 0.35rem 0.65rem;
      font-size: 0.78rem;
    }
    .dot-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1rem;
    }
    .dot-filter-bar input[type='search'] {
      min-width: 240px;
    }
    .history-panel {
      margin-top: 1rem;
    }
  `,
})
export class DotacionAsociados implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(InventoryApiService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<DotacionAssociate[]>([]);
  readonly page = signal(1);
  readonly limit = signal(25);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly search = signal('');

  readonly deliveryOpen = signal(false);
  readonly deliveryAssociateId = signal<string | null>(null);
  readonly deliverySubject = signal('');

  readonly historyOpen = signal(false);
  readonly historyAssociateId = signal<string | null>(null);
  readonly historySubject = signal('');

  ngOnInit(): void {
    this.load();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  goPage(next: number): void {
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.load();
  }

  openDelivery(row: DotacionAssociate): void {
    this.deliveryAssociateId.set(row.id);
    this.deliverySubject.set(`${row.fullName} (${row.documentNumber})`);
    this.deliveryOpen.set(true);
  }

  closeDelivery(): void {
    this.deliveryOpen.set(false);
    this.deliveryAssociateId.set(null);
  }

  onDeliveryCompleted(): void {
    this.closeDelivery();
    if (this.historyOpen() && this.historyAssociateId()) {
      // history component reloads via effect on associateId
    }
  }

  openHistory(row: DotacionAssociate): void {
    this.historyAssociateId.set(row.id);
    this.historySubject.set(row.fullName);
    this.historyOpen.set(true);
  }

  closeHistory(): void {
    this.historyOpen.set(false);
    this.historyAssociateId.set(null);
    this.historySubject.set('');
  }

  workCenterLabel(row: DotacionAssociate): string {
    if (row.workCenterZone) return row.workCenterZone;
    if (row.workCenterClient) return row.workCenterClient;
    return row.workCenterCode ?? '—';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listDotacionAssociates({
        page: this.page(),
        limit: this.limit(),
        search: this.search().trim() || undefined,
      })
      .subscribe({
        next: (res: PaginatedDotacionAssociates) => {
          this.rows.set(res.items);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.page.set(res.page);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'No se pudo cargar el listado de asociados.');
          this.loading.set(false);
        },
      });
  }
}
