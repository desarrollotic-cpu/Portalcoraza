import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { DotacionOverview, InventoryApiService, InventoryItem } from '../inventory-api.service';

@Component({
  selector: 'app-dotacion-panel',
  imports: [RouterLink, DatePipe, Icon, StatsKpiGrid],
  template: `
    <div class="dot-page">
      @if (error()) {
        <div class="dot-error">{{ error() }}</div>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      @if (!loading() && data(); as d) {
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
                Buscar por nombre o cédula
                <input
                  type="search"
                  placeholder="Ej. Muñoz o 1020…"
                  [value]="associateSearch()"
                  (input)="onAssociateSearch($event)"
                  autocomplete="off"
                />
              </label>
              @if (selectedAssociate(); as sel) {
                <div class="dot-picked">
                  <div>
                    <strong>{{ sel.fullName }}</strong>
                    <span class="dot-muted">CC {{ sel.documentNumber }}</span>
                  </div>
                  <button type="button" class="hr-btn hr-btn-ghost" (click)="clearAssociate()">Cambiar</button>
                </div>
              } @else if (associateSearch().trim()) {
                @if (associateSearching()) {
                  <p class="dot-muted">Buscando…</p>
                } @else if (associateOptions().length === 0) {
                  <p class="dot-muted">Sin coincidencias.</p>
                } @else {
                  <ul class="dot-suggest" role="listbox">
                    @for (a of associateOptions(); track a.id) {
                      <li>
                        <button type="button" class="dot-suggest__btn" (click)="pickAssociate(a)">
                          <strong>{{ a.fullName }}</strong>
                          <span>CC {{ a.documentNumber }}</span>
                        </button>
                      </li>
                    }
                  </ul>
                  @if (associateOptionsTotal() > associateOptions().length) {
                    <p class="dot-muted">Mostrando {{ associateOptions().length }} de {{ associateOptionsTotal() }}. Afina la búsqueda.</p>
                  }
                }
              } @else {
                <p class="dot-muted">Escribe y elige al asociado en la lista.</p>
              }
              <div class="dot-period">
                <label>
                  Semestre
                  <select [value]="reportSemester()" (change)="onReportSemester($event)">
                    <option value="1">1 (ene–jun)</option>
                    <option value="2">2 (jul–dic)</option>
                  </select>
                </label>
                <label>
                  Año
                  <select [value]="reportYear()" (change)="onReportYear($event)">
                    @for (y of reportYears; track y) {
                      <option [value]="y">{{ y }}</option>
                    }
                  </select>
                </label>
              </div>
              <button type="button" class="hr-btn hr-btn-primary" [disabled]="reportLoading() || !selectedAssociate()" (click)="downloadAssociate()">
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
                <app-icon [icon]="icons.Users" [size]="26" />
              </div>
              <div class="dot-dash-kpi__body">
                <span class="dot-dash-kpi__label">Asociados</span>
                <strong class="dot-dash-kpi__value">→</strong>
                <span class="dot-dash-kpi__hint">Entregas e historial</span>
              </div>
            </a>
            <a routerLink="/dotacion/inventario" class="dot-dash-kpi">
              <div class="dot-dash-kpi__icon">
                <app-icon [icon]="icons.Boxes" [size]="26" />
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
                  <app-icon [icon]="icons.Truck" [size]="26" />
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
                <app-icon [icon]="icons.Clock" [size]="26" />
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
    .dot-suggest {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 220px;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface, #fff);
    }
    .dot-suggest__btn {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      padding: 0.55rem 0.7rem;
      border: none;
      border-bottom: 1px solid var(--border);
      background: transparent;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .dot-suggest li:last-child .dot-suggest__btn { border-bottom: none; }
    .dot-suggest__btn:hover { background: #eff6ff; }
    .dot-suggest__btn span { font-size: 0.8rem; color: var(--text-secondary); }
    .dot-picked {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #eff6ff;
    }
    .dot-picked strong { display: block; font-size: 0.9rem; }
    .dot-period {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
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

  readonly kpiItems = computed<StatsKpiItem[]>(() => {
    const d = this.data();
    const canDeliveries =
      this.auth.hasPermission('deliveries.view') || this.auth.hasPermission('inventory.view');
    return [
      {
        label: 'Asociados',
        value: d?.totalActiveAssociates ?? '—',
        hint: 'Activos y vacaciones',
        link: '/dotacion/asociados',
      },
      {
        label: 'Artículos',
        value: d?.inventoryItemCount ?? '—',
        hint: d ? `${d.inventoryVariantCount} variantes` : undefined,
        link: '/dotacion/inventario',
      },
      {
        label: 'Stock bajo',
        value: d?.lowStockCount ?? '—',
        hint: 'Variantes bajo umbral',
        link: '/dotacion/inventario',
        warn: (d?.lowStockCount ?? 0) > 0,
      },
      {
        label: 'Pendientes',
        value: d?.pendingDeliveries ?? '—',
        hint: 'Entregas por firmar',
        link: canDeliveries ? '/dotacion/asociados' : null,
      },
      {
        label: 'Hoy / semana',
        value: d ? `${d.deliveredToday} / ${d.deliveredThisWeek}` : '—',
        hint: 'Entregas confirmadas',
      },
      {
        label: 'Sin dotación 7+ meses',
        value: d?.withoutDotacionCount ?? '—',
        hint: d ? `De ${d.totalActiveAssociates} activos/vacaciones` : undefined,
        link: '/dotacion/sin-dotacion',
        warn: (d?.withoutDotacionCount ?? 0) > 0,
      },
    ];
  });
  readonly items = signal<InventoryItem[]>([]);
  readonly associateOptions = signal<{ id: string; fullName: string; documentNumber: string }[]>([]);
  readonly associateOptionsTotal = signal(0);
  readonly associateSearching = signal(false);
  readonly selectedItemId = signal('');
  readonly selectedAssociate = signal<{ id: string; fullName: string; documentNumber: string } | null>(null);
  readonly associateSearch = signal('');
  readonly reportSemester = signal<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);
  readonly reportYear = signal(new Date().getFullYear());
  readonly reportYears = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: y - 2023 }, (_, i) => y - i);
  })();
  readonly reportLoading = signal(false);
  readonly reportError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listItems().subscribe({ next: (items) => this.items.set(items) });
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

  onAssociateSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.associateSearch.set(value);
    this.selectedAssociate.set(null);
    if (this.associateSearchTimer) clearTimeout(this.associateSearchTimer);
    const cleaned = value.trim();
    if (!cleaned) {
      this.associateOptions.set([]);
      this.associateOptionsTotal.set(0);
      this.associateSearching.set(false);
      return;
    }
    this.associateSearching.set(true);
    this.associateSearchTimer = setTimeout(() => this.loadAssociateOptions(cleaned), 280);
  }

  pickAssociate(a: { id: string; fullName: string; documentNumber: string }): void {
    this.selectedAssociate.set(a);
    this.associateSearch.set(`${a.fullName} · ${a.documentNumber}`);
    this.associateOptions.set([]);
    this.associateOptionsTotal.set(0);
  }

  clearAssociate(): void {
    this.selectedAssociate.set(null);
    this.associateSearch.set('');
    this.associateOptions.set([]);
    this.associateOptionsTotal.set(0);
  }

  onReportSemester(event: Event): void {
    const v = Number((event.target as HTMLSelectElement).value);
    this.reportSemester.set(v === 1 ? 1 : 2);
  }

  onReportYear(event: Event): void {
    this.reportYear.set(Number((event.target as HTMLSelectElement).value));
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
    const a = this.selectedAssociate();
    if (!a) return;
    const semester = this.reportSemester();
    const year = this.reportYear();
    const safe = a.fullName.replace(/[^\wÁÉÍÓÚáéíóúñÑ]+/g, '_').slice(0, 60);
    const doc = a.documentNumber.replace(/\D/g, '') || 'sin-doc';
    this.runReport(
      () => this.api.downloadAssociateReport(a.id, { semester, year }),
      `Historial_Entregas_${safe}_${doc}_S${semester}_${year}.pdf`,
    );
  }

  private loadAssociateOptions(search: string): void {
    const cleaned = search.trim().replace(/\s+/g, ' ');
    this.api.listDotacionAssociates({ page: 1, limit: 30, search: cleaned || undefined }).subscribe({
      next: (res) => {
        const items = res.items.map((row) => ({
          id: row.id,
          fullName: row.fullName,
          documentNumber: row.documentNumber,
        }));
        this.associateOptions.set(items);
        this.associateOptionsTotal.set(res.total);
        this.associateSearching.set(false);
        if (items.length === 1) {
          this.pickAssociate(items[0]);
        }
      },
      error: () => {
        this.associateSearching.set(false);
        this.associateOptions.set([]);
        this.associateOptionsTotal.set(0);
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
