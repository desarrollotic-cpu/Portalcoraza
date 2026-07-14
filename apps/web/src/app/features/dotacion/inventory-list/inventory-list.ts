import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AddStockDialog } from '../add-stock-dialog/add-stock-dialog';
import { InventoryApiService, InventoryItem, InventoryVariant } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';

interface ItemRow {
  item: InventoryItem;
  variants: InventoryVariant[];
  totalStock: number;
  primaryVariant: InventoryVariant | null;
}

@Component({
  selector: 'app-inventory-list',
  imports: [RouterLink, AddStockDialog, ModalShell],
  template: `
    <section>
      <header class="toolbar">
        <h2>Inventario de Dotación</h2>
        <a routerLink="/dotacion/inventario/nuevo" class="btn-primary">Agregar elemento</a>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.item.id) {
              <tr [class.low-stock]="row.totalStock < row.item.lowStockThreshold">
                <td>
                  <strong class="item-name">{{ row.item.name }}</strong>
                  @if (row.variants.length > 1) {
                    <div class="size-lines">
                      @for (v of row.variants; track v.id) {
                        <span class="size-chip">
                          {{ sizeLabel(v) }}: {{ v.stockCurrent }}
                        </span>
                      }
                    </div>
                  }
                </td>
                <td><code>{{ row.item.code }}</code></td>
                <td>{{ row.item.category?.name ?? '—' }}</td>
                <td>
                  <span [class.stock-ok]="row.totalStock > 0" [class.stock-zero]="row.totalStock === 0">
                    {{ row.totalStock }} und.
                  </span>
                  @if (row.item.lowStockThreshold > 0) {
                    <div class="muted">mín. {{ row.item.lowStockThreshold }}</div>
                  }
                </td>
                <td class="actions-cell">
                  @if (row.primaryVariant) {
                    <button
                      type="button"
                      class="btn-stock"
                      (click)="openAddStock(row.primaryVariant, row.item)"
                    >
                      Agregar Stock
                    </button>
                  }
                  <a [routerLink]="['/dotacion/inventario', row.item.id, 'editar']" class="link-edit">
                    Editar
                  </a>
                  <button type="button" class="btn-delete" (click)="askDelete(row.item)">
                    Eliminar
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">No hay elementos. Usa “Agregar elemento” para crear el primero.</td>
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

    <app-modal-shell
      [open]="deleteDialogOpen()"
      title="Eliminar elemento"
      (closed)="closeDelete()"
    >
      @if (itemToDelete(); as item) {
        <p class="confirm-text">
          ¿Seguro que deseas eliminar
          <strong>{{ item.name }}</strong>
          (<code>({{ item.code }})</code>?
        </p>
        <p class="confirm-warn">
          Se borrará el stock y el historial de movimientos de este elemento.
          Si ya se usó en una entrega, no se podrá eliminar.
        </p>
        @if (deleteError()) {
          <p class="error">{{ deleteError() }}</p>
        }
        <div class="confirm-actions">
          <button type="button" class="btn-ghost" [disabled]="deleting()" (click)="closeDelete()">
            Cancelar
          </button>
          <button type="button" class="btn-danger" [disabled]="deleting()" (click)="confirmDelete()">
            {{ deleting() ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>
      }
    </app-modal-shell>
  `,
  styles: `
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    h2 { margin: 0; font-size: 1.2rem; }
    .btn-primary {
      display: inline-block;
      padding: 0.55rem 1rem;
      background: var(--primary, #1d4ed8);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--coraza-border, #e5e5e5);
      border-radius: 10px;
      overflow: hidden;
      background: #fff;
    }
    th, td {
      text-align: left;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--coraza-border, #e5e5e5);
      vertical-align: top;
    }
    th {
      background: #f8fafc;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      font-weight: 600;
    }
    .item-name { color: var(--primary, #1d4ed8); font-size: 1rem; }
    .low-stock { background: #fff8f0; }
    .stock-ok { color: #15803d; font-weight: 600; }
    .stock-zero { color: #b91c1c; font-weight: 600; }
    .muted { color: #737373; font-size: 0.8rem; margin-top: 0.15rem; }
    .size-lines { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
    .size-chip {
      font-size: 0.75rem;
      background: #f1f5f9;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
    }
    .actions-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .btn-stock {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      background: #16a34a;
      color: #fff;
      cursor: pointer;
    }
    .btn-delete {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      cursor: pointer;
    }
    .link-edit {
      font-size: 0.85rem;
      color: var(--primary, #1d4ed8);
    }
    code {
      font-size: 0.85rem;
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .error { color: var(--coraza-error, #b91c1c); }
    .confirm-text { margin: 0 0 0.75rem; font-size: 1rem; line-height: 1.4; }
    .confirm-warn {
      margin: 0 0 1rem;
      padding: 0.65rem 0.8rem;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      color: #9a3412;
      font-size: 0.85rem;
    }
    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }
    .btn-ghost, .btn-danger {
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-ghost {
      background: #fff;
      border: 1px solid #d4d4d4;
    }
    .btn-danger {
      background: #dc2626;
      border: none;
      color: #fff;
    }
    .btn-danger:disabled, .btn-ghost:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  `,
})
export class InventoryList implements OnInit {
  private readonly api = inject(InventoryApiService);

  readonly rows = signal<ItemRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stockDialogOpen = signal(false);
  readonly stockVariant = signal<InventoryVariant | null>(null);

  readonly deleteDialogOpen = signal(false);
  readonly itemToDelete = signal<InventoryItem | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  sizeLabel(v: InventoryVariant): string {
    const entries = Object.entries(v.attributes ?? {});
    if (!entries.length) return 'Principal';
    return entries.map(([, val]) => String(val)).join(' / ');
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

  askDelete(item: InventoryItem): void {
    this.itemToDelete.set(item);
    this.deleteError.set(null);
    this.deleting.set(false);
    this.deleteDialogOpen.set(true);
  }

  closeDelete(): void {
    if (this.deleting()) return;
    this.deleteDialogOpen.set(false);
    this.itemToDelete.set(null);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.deleting.set(true);
    this.deleteError.set(null);
    this.api.deleteItem(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteDialogOpen.set(false);
        this.itemToDelete.set(null);
        this.reload();
      },
      error: (err) => {
        this.deleting.set(false);
        this.deleteError.set(
          err?.error?.message ?? 'No se pudo eliminar el elemento.',
        );
      },
    });
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
            const primary =
              itemVariants.find((v) => v.sku === item.code) ??
              itemVariants.find((v) => Object.keys(v.attributes ?? {}).length === 0) ??
              itemVariants[0] ??
              null;
            return {
              item,
              variants: itemVariants,
              totalStock: itemVariants.reduce((sum, v) => sum + v.stockCurrent, 0),
              primaryVariant: primary,
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
