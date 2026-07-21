import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  LucideAlertTriangle,
  LucideBoxes,
  LucideClock,
  LucidePackageSearch,
  LucideTruck,
  LucideUsers,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { DotacionOverview, InventoryApiService, InventoryItem } from '../inventory-api.service';

@Component({
  selector: 'app-dotacion-panel',
  imports: [RouterLink, DatePipe, Icon],
  template: `
    <div class="dot-page">
      @if (loading()) {
        <div class="dot-dash-kpi-grid">
          @for (i of [0, 1, 2, 3]; track i) {
            <div class="dot-skeleton"></div>
          }
        </div>
      } @else if (error()) {
        <div class="dot-error">{{ error() }}</div>
      } @else if (data(); as d) {
        <section class="dot-dash-kpi-grid">
          <a routerLink="/dotacion/asociados" class="dot-dash-kpi">
            <div class="dot-dash-kpi__icon">
              <app-icon [icon]="icons.Users" [size]="22" />
            </div>
            <div class="dot-dash-kpi__body">
              <span class="dot-dash-kpi__label">Asociados</span>
              <strong class="dot-dash-kpi__value">{{ d.totalActiveAssociates }}</strong>
              <span class="dot-dash-kpi__hint">Activos y vacaciones</span>
            </div>
          </a>

          <a routerLink="/dotacion/inventario" class="dot-dash-kpi">
            <div class="dot-dash-kpi__icon">
              <app-icon [icon]="icons.Boxes" [size]="22" />
            </div>
            <div class="dot-dash-kpi__body">
              <span class="dot-dash-kpi__label">Artículos</span>
              <strong class="dot-dash-kpi__value">{{ d.inventoryItemCount }}</strong>
              <span class="dot-dash-kpi__hint">{{ d.inventoryVariantCount }} variantes</span>
            </div>
          </a>

          <a routerLink="/dotacion/inventario" class="dot-dash-kpi">
            <div class="dot-dash-kpi__icon dot-dash-kpi__icon--warn">
              <app-icon [icon]="icons.Alert" [size]="22" />
            </div>
            <div class="dot-dash-kpi__body">
              <span class="dot-dash-kpi__label">Stock bajo</span>
              <strong class="dot-dash-kpi__value">{{ d.lowStockCount }}</strong>
              <span class="dot-dash-kpi__hint">Variantes bajo umbral</span>
            </div>
          </a>

          @if (auth.hasPermission('deliveries.view') || auth.hasPermission('inventory.view')) {
            <a routerLink="/dotacion/asociados" class="dot-dash-kpi">
              <div class="dot-dash-kpi__icon">
                <app-icon [icon]="icons.Clock" [size]="22" />
              </div>
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">Pendientes</span>
                <strong class="dot-dash-kpi__value">{{ d.pendingDeliveries }}</strong>
                <span class="dot-dash-kpi__hint">Entregas por firmar</span>
              </div>
            </a>
          } @else {
            <div class="dot-dash-kpi">
              <div class="dot-dash-kpi__icon">
                <app-icon [icon]="icons.Clock" [size]="22" />
              </div>
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">Pendientes</span>
                <strong class="dot-dash-kpi__value">{{ d.pendingDeliveries }}</strong>
                <span class="dot-dash-kpi__hint">Entregas por firmar</span>
              </div>
            </div>
          }

          <div class="dot-dash-kpi">
            <div class="dot-dash-kpi__icon dot-dash-kpi__icon--ok">
              <app-icon [icon]="icons.Truck" [size]="22" />
            </div>
            <div class="dot-dash-kpi__body">
              <span class="dot-dash-kpi__label">Hoy / semana</span>
              <strong class="dot-dash-kpi__value">{{ d.deliveredToday }} / {{ d.deliveredThisWeek }}</strong>
              <span class="dot-dash-kpi__hint">Entregas confirmadas</span>
            </div>
          </div>

          <a routerLink="/dotacion/sin-dotacion" class="dot-dash-kpi">
            <div class="dot-dash-kpi__icon dot-dash-kpi__icon--alert">
              <app-icon [icon]="icons.PackageSearch" [size]="22" />
            </div>
            <div class="dot-dash-kpi__body">
              <span class="dot-dash-kpi__label">Sin dotación 7+ meses</span>
              <strong class="dot-dash-kpi__value">{{ d.withoutDotacionCount }}</strong>
              <span class="dot-dash-kpi__hint">De {{ d.totalActiveAssociates }} activos/vacaciones</span>
            </div>
          </a>
        </section>

        <div class="dot-dash-two-col">
          <section class="dot-dash-panel">
            <header class="dot-dash-panel__head">
              <h2>Stock bajo</h2>
              <a routerLink="/dotacion/inventario" class="dot-muted">Ver inventario</a>
            </header>
            @if (d.lowStockItems.length) {
              <div class="dot-table-wrap">
                <table class="dot-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Ítem</th>
                      <th>Stock</th>
                      <th>Umbral</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of d.lowStockItems; track item.sku) {
                      <tr class="dot-row-low">
                        <td>{{ item.sku }}</td>
                        <td>{{ item.itemName }}</td>
                        <td>{{ item.stockCurrent }}</td>
                        <td>{{ item.threshold }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="dot-empty">No hay variantes con stock bajo.</p>
            }
          </section>

          <section class="dot-dash-panel">
            <header class="dot-dash-panel__head">
              <h2>Entregas recientes</h2>
              <a routerLink="/dotacion/asociados" class="dot-muted">Ir a asociados</a>
            </header>
            @if (d.recentDeliveries.length) {
              <div class="dot-table-wrap">
                <table class="dot-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Asociado</th>
                      <th>Estado</th>
                      <th>Ítems</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of d.recentDeliveries; track row.id) {
                      <tr>
                        <td>{{ row.date | date: 'short' }}</td>
                        <td>{{ row.associateName ?? 'Puesto / sin asociado' }}</td>
                        <td>
                          <span class="dot-badge" [class]="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
                        </td>
                        <td>{{ row.itemCount }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="dot-empty">Aún no hay entregas registradas.</p>
            }
          </section>
        </div>

        <section class="dot-dash-panel">
          <header class="dot-dash-panel__head">
            <h2>Artículos más entregados</h2>
          </header>
          @if (d.topDeliveredItems.length) {
            <div class="dot-table-wrap">
              <table class="dot-table">
                <thead>
                  <tr>
                    <th>Ítem</th>
                    <th>SKU</th>
                    <th>Total entregado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of d.topDeliveredItems; track item.sku) {
                    <tr>
                      <td>{{ item.itemName }}</td>
                      <td>{{ item.sku }}</td>
                      <td>{{ item.totalQuantity }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="dot-empty">Aún no hay entregas confirmadas.</p>
          }
        </section>

        <section class="dot-dash-panel">
          <header class="dot-dash-panel__head">
            <h2>Reportes PDF</h2>
            <span class="dot-muted">Descarga directa en tablet</span>
          </header>
          <div class="dot-reports-grid">
            <div class="dot-report-card">
              <h3>Reporte general por elementos</h3>
              <p class="dot-muted">Todos los elementos entregados con totales y detalle.</p>
              <button type="button" class="hr-btn hr-btn-primary" [disabled]="reportLoading()" (click)="downloadGeneral()">
                Descargar PDF
              </button>
            </div>
            <div class="dot-report-card">
              <h3>Reporte por elemento</h3>
              <label>
                Elemento
                <select [value]="selectedItemId()" (change)="onItemSelect($event)">
                  <option value="">Seleccione...</option>
                  @for (item of items(); track item.id) {
                    <option [value]="item.id">{{ item.name }}</option>
                  }
                </select>
              </label>
              <button type="button" class="hr-btn hr-btn-primary" [disabled]="reportLoading() || !selectedItemId()" (click)="downloadItem()">
                Descargar PDF
              </button>
            </div>
            <div class="dot-report-card">
              <h3>Reporte individual de asociado</h3>
              <label>
                Buscar asociado
                <input type="search" placeholder="Nombre o cédula..." [value]="associateSearch()" (input)="onAssociateSearch($event)" />
              </label>
              <select [value]="selectedAssociateId()" (change)="onAssociateSelect($event)">
                <option value="">Seleccione...</option>
                @for (a of associateOptions(); track a.id) {
                  <option [value]="a.id">{{ a.fullName }} ({{ a.documentNumber }})</option>
                }
              </select>
              <button type="button" class="hr-btn hr-btn-primary" [disabled]="reportLoading() || !selectedAssociateId()" (click)="downloadAssociate()">
                Descargar PDF
              </button>
            </div>
          </div>
          @if (reportError()) {
            <p class="dot-error" style="margin-top:0.75rem">{{ reportError() }}</p>
          }
        </section>

        <section class="dot-dash-panel">
          <header class="dot-dash-panel__head">
            <h2>Accesos rápidos</h2>
          </header>
          <div class="dot-dash-kpi-grid">
            <a routerLink="/dotacion/asociados" class="dot-dash-kpi">
              <div class="dot-dash-kpi__icon">
                <app-icon [icon]="icons.Users" [size]="22" />
              </div>
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">Asociados</span>
                <strong class="dot-dash-kpi__value">→</strong>
                <span class="dot-dash-kpi__hint">Entregas e historial</span>
              </div>
            </a>
            <a routerLink="/dotacion/inventario" class="dot-dash-kpi">
              <div class="dot-dash-kpi__icon">
                <app-icon [icon]="icons.Boxes" [size]="22" />
              </div>
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">Inventario</span>
                <strong class="dot-dash-kpi__value">→</strong>
                <span class="dot-dash-kpi__hint">Ítems, variantes y stock</span>
              </div>
            </a>
            @if (auth.hasPermission('deliveries.create')) {
              <a routerLink="/dotacion/asociados" class="dot-dash-kpi">
                <div class="dot-dash-kpi__icon dot-dash-kpi__icon--ok">
                  <app-icon [icon]="icons.Truck" [size]="22" />
                </div>
                <div class="dot-dash-kpi__body">
                  <span class="dot-dash-kpi__label">Nueva entrega</span>
                  <strong class="dot-dash-kpi__value">+</strong>
                  <span class="dot-dash-kpi__hint">Desde listado de asociados</span>
                </div>
              </a>
            }
            <a routerLink="/dotacion/movimientos" class="dot-dash-kpi">
              <div class="dot-dash-kpi__icon">
                <app-icon [icon]="icons.Clock" [size]="22" />
              </div>
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">Historial</span>
                <strong class="dot-dash-kpi__value">→</strong>
                <span class="dot-dash-kpi__hint">Movimientos y entregas</span>
              </div>
            </a>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .dot-reports-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .dot-report-card {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface-2);
    }
    .dot-report-card h3 {
      margin: 0;
      font-size: 0.92rem;
    }
    .dot-report-card label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: var(--text-secondary);
    }
  `,
})
export class DotacionPanel implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(InventoryApiService);
  private associateSearchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly icons = {
    Alert: LucideAlertTriangle,
    Boxes: LucideBoxes,
    Clock: LucideClock,
    PackageSearch: LucidePackageSearch,
    Truck: LucideTruck,
    Users: LucideUsers,
  };

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<DotacionOverview | null>(null);
  readonly items = signal<InventoryItem[]>([]);
  readonly associateOptions = signal<{ id: string; fullName: string; documentNumber: string }[]>([]);
  readonly selectedItemId = signal('');
  readonly selectedAssociateId = signal('');
  readonly associateSearch = signal('');
  readonly reportLoading = signal(false);
  readonly reportError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listItems().subscribe({ next: (items) => this.items.set(items) });
    this.loadAssociateOptions('');
    this.api.getDotacionOverview().subscribe({
      next: (overview) => {
        this.data.set(overview);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'No se pudo cargar el panel de dotación.');
        this.loading.set(false);
      },
    });
  }

  statusClass(status: string): string {
    if (status === 'DELIVERED') return 'dot-badge dot-badge--delivered';
    if (status === 'REVERTED') return 'dot-badge dot-badge--reverted';
    return 'dot-badge dot-badge--pending';
  }

  statusLabel(status: string): string {
    if (status === 'DELIVERED') return 'Entregada';
    if (status === 'REVERTED') return 'Revertida';
    if (status === 'PENDING') return 'Pendiente';
    return status;
  }

  onItemSelect(event: Event): void {
    this.selectedItemId.set((event.target as HTMLSelectElement).value);
  }

  onAssociateSelect(event: Event): void {
    this.selectedAssociateId.set((event.target as HTMLSelectElement).value);
  }

  onAssociateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.associateSearch.set(value);
    if (this.associateSearchTimer) clearTimeout(this.associateSearchTimer);
    this.associateSearchTimer = setTimeout(() => this.loadAssociateOptions(value), 350);
  }

  downloadGeneral(): void {
    this.runReport(() => this.api.downloadGeneralReport(), 'reporte-general-dotacion.pdf');
  }

  downloadItem(): void {
    const id = this.selectedItemId();
    if (!id) return;
    this.runReport(() => this.api.downloadItemReport(id), 'reporte-elemento-dotacion.pdf');
  }

  downloadAssociate(): void {
    const id = this.selectedAssociateId();
    if (!id) return;
    this.runReport(() => this.api.downloadAssociateReport(id), 'reporte-asociado-dotacion.pdf');
  }

  private loadAssociateOptions(search: string): void {
    this.api.listDotacionAssociates({ page: 1, limit: 30, search: search || undefined }).subscribe({
      next: (res) => {
        this.associateOptions.set(
          res.items.map((a) => ({
            id: a.id,
            fullName: a.fullName,
            documentNumber: a.documentNumber,
          })),
        );
      },
    });
  }

  private runReport(factory: () => Observable<Blob>, filename: string): void {
    this.reportLoading.set(true);
    this.reportError.set(null);
    factory().subscribe({
      next: (blob) => {
        this.api.triggerDownload(blob, filename);
        this.reportLoading.set(false);
      },
      error: () => {
        this.reportError.set('No se pudo generar el reporte PDF.');
        this.reportLoading.set(false);
      },
    });
  }
}
