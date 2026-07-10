import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AddStockDialog } from '../add-stock-dialog/add-stock-dialog';
import { InventoryApiService, InventoryItem, InventoryVariant } from '../inventory-api.service';

interface ItemRow {
  item: InventoryItem;
  variants: InventoryVariant[];
  totalStock: number;
}

@Component({
  selector: 'app-inventory-list',
  imports: [RouterLink, AddStockDialog],
  template: `
    <section>
      <header class="toolbar">
        <a routerLink="/dotacion/inventario/nuevo" class="btn-primary">Nuevo ítem</a>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Variantes</th>
              <th>Stock total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.item.id) {
              <tr [class.low-stock]="row.totalStock < row.item.lowStockThreshold">
                <td>{{ row.item.code }}</td>
                <td>{{ row.item.name }}</td>
                <td>{{ row.item.category?.name ?? '—' }}</td>
                <td>
                  @for (v of row.variants; track v.id) {
                    <div class="variant-line">
                      {{ v.sku }}: {{ v.stockCurrent }}
                      @if (formatAttributes(v.attributes)) {
                        <span class="muted">({{ formatAttributes(v.attributes) }})</span>
                      }
                      <button type="button" class="btn-stock" (click)="openAddStock(v, row.item)">+ Stock</button>
                    </div>
                  } @empty {
                    <span class="muted">Sin variantes</span>
                  }
                </td>
                <td>{{ row.totalStock }}</td>
                <td>
                  <a [routerLink]="['/dotacion/inventario', row.item.id, 'editar']">Editar</a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No hay ítems de inventario.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>

    <app-add-stock-dialog
      [open]="stockDialogOpen()"
      [variant]="stockVariant()"
      (completed)="onStockAdded()"
      (dismissed)="closeAddStock()"
    />
  `,
  styles: `
    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }
    .btn-primary {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--primary);
      color: var(--text-on-primary);
      text-decoration: none;
      border-radius: var(--coraza-radius);
      font-size: 0.9rem;
      font-weight: 500;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: transparent;
      border-radius: var(--coraza-radius);
      overflow: hidden;
      border: 1px solid var(--coraza-border);
    }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid var(--coraza-border); }
    th {
      background: var(--primary-50);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--primary-dark);
      font-weight: 600;
    }
    .low-stock { background: #fff8f0; }
    .variant-line { font-size: 0.85rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem; }
    .btn-stock {
      padding: 0.15rem 0.45rem;
      font-size: 0.72rem;
      border: 1px solid var(--coraza-border);
      border-radius: 6px;
      background: var(--coraza-surface);
      cursor: pointer;
    }
    .muted { color: var(--coraza-text-muted); font-size: 0.85rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class InventoryList implements OnInit {
  private readonly api = inject(InventoryApiService);

  readonly rows = signal<ItemRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stockDialogOpen = signal(false);
  readonly stockVariant = signal<InventoryVariant | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  formatAttributes(attrs: Record<string, unknown>): string {
    const entries = Object.entries(attrs ?? {});
    if (!entries.length) return '';
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ');
  }

  openAddStock(variant: InventoryVariant, item: InventoryItem): void {
    this.stockVariant.set({ ...variant, item });
    this.stockDialogOpen.set(true);
  }

  closeAddStock(): void {
    this.stockDialogOpen.set(false);
    this.stockVariant.set(null);
  }

  onStockAdded(): void {
    this.closeAddStock();
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    forkJoin({
      items: this.api.listItems(),
      variants: this.api.listVariants(),
    }).subscribe({
      next: ({ items, variants }) => {
        const byItem = new Map<string, InventoryVariant[]>();
        for (const v of variants) {
          const list = byItem.get(v.itemId) ?? [];
          list.push(v);
          byItem.set(v.itemId, list);
        }
        this.rows.set(
          items.map((item) => {
            const itemVariants = byItem.get(item.id) ?? [];
            return {
              item,
              variants: itemVariants,
              totalStock: itemVariants.reduce((sum, v) => sum + v.stockCurrent, 0),
            };
          }),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el inventario');
      },
    });
  }
}
