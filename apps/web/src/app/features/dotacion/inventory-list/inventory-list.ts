import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AddStockDialog } from '../add-stock-dialog/add-stock-dialog';
import { InventoryApiService, InventoryItem, InventoryVariant } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';

interface ItemRow {
  item: InventoryItem;
  variants: InventoryVariant[];
  groups: VariantGroup[];
  stockMedellin: number;
  stockRionegro: number;
  primaryVariant: InventoryVariant | null;
}

interface VariantGroup {
  key: string;
  label: string | null;
  variants: InventoryVariant[];
}

function genderCode(v: InventoryVariant): 'F' | 'M' | '' {
  const raw = v.genero ?? (v.attributes?.['genero'] != null ? String(v.attributes['genero']) : '');
  if (raw === 'F' || raw === 'Mujer') return 'F';
  if (raw === 'M' || raw === 'Hombre') return 'M';
  return '';
}

function tallaOf(v: InventoryVariant): string {
  return String(v.talla ?? v.attributes?.['talla'] ?? '').trim();
}

function sortVariants(list: InventoryVariant[]): InventoryVariant[] {
  const rank = (g: 'F' | 'M' | '') => (g === 'F' ? 0 : g === 'M' ? 1 : 2);
  return [...list].sort((a, b) => {
    const rg = rank(genderCode(a)) - rank(genderCode(b));
    if (rg !== 0) return rg;
    return tallaOf(a).localeCompare(tallaOf(b), undefined, { numeric: true });
  });
}

function groupVariants(list: InventoryVariant[]): VariantGroup[] {
  const sorted = sortVariants(list);
  const hasGender = sorted.some((v) => genderCode(v) !== '');
  if (!hasGender) {
    return [{ key: 'all', label: null, variants: sorted }];
  }
  const groups: VariantGroup[] = [];
  const push = (key: string, label: string, pred: (v: InventoryVariant) => boolean) => {
    const variants = sorted.filter(pred);
    if (variants.length) groups.push({ key, label, variants });
  };
  push('F', 'Mujer', (v) => genderCode(v) === 'F');
  push('M', 'Hombre', (v) => genderCode(v) === 'M');
  push('U', 'Sin género', (v) => genderCode(v) === '');
  return groups;
}

@Component({
  selector: 'app-inventory-list',
  imports: [RouterLink, AddStockDialog, ModalShell, FormsModule],
  template: `
    <section>
      <header class="toolbar">
        <div>
          <h2>Inventario de Dotación</h2>
          @if (auth.currentUser()?.warehouse?.name; as wh) {
            <p class="muted">Tu almacén: <strong>{{ wh }}</strong>. Ves las dos sedes; solo cargas y trasladas desde la tuya.</p>
          }
        </div>
        @if (auth.hasPermission('inventory.create')) {
          <a routerLink="/dotacion/inventario/nuevo" class="btn-primary">Agregar elemento</a>
        }
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
              <th>Medellín</th>
              <th>Rionegro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.item.id) {
              <tr>
                <td>
                  <strong class="item-name">{{ row.item.name }}</strong>
                  @if (row.item.createdByName) {
                    <div class="muted">Creado por {{ row.item.createdByName }}</div>
                  }
                  @if (row.groups.length) {
                    <div class="size-lines">
                      @for (group of row.groups; track group.key) {
                        <div class="size-group">
                          @if (group.label) {
                            <div class="size-group__label">{{ group.label }}</div>
                          }
                          <div class="size-group__chips">
                            @for (v of group.variants; track v.id) {
                              <span class="size-chip">
                                <span class="size-chip__main">{{ chipLabel(v, !!group.label) }}</span>
                                <span class="size-chip__stock">
                                  M&nbsp;{{ stockOf(v, 'MEDELLIN') }}
                                  <span class="size-chip__sep">·</span>
                                  R&nbsp;{{ stockOf(v, 'RIONEGRO') }}
                                </span>
                                @if (auth.hasPermission('inventory.move')) {
                                  <button type="button" class="chip-btn" (click)="openAddStock(v, row.item, row.variants)">+ stock</button>
                                  <button type="button" class="chip-btn" (click)="openTransfer(v, row.item)">traslado</button>
                                }
                              </span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </td>
                <td><code>{{ row.item.code }}</code></td>
                <td>{{ row.item.category?.name ?? '—' }}</td>
                <td>
                  <span [class.stock-ok]="row.stockMedellin > 0" [class.stock-zero]="row.stockMedellin === 0">
                    {{ row.stockMedellin }}
                  </span>
                </td>
                <td>
                  <span [class.stock-ok]="row.stockRionegro > 0" [class.stock-zero]="row.stockRionegro === 0">
                    {{ row.stockRionegro }}
                  </span>
                </td>
                <td class="actions-cell">
                  @if (row.primaryVariant && auth.hasPermission('inventory.move')) {
                    <button
                      type="button"
                      class="btn-stock"
                      (click)="openAddStock(row.primaryVariant, row.item, row.variants)"
                    >
                      Agregar Stock
                    </button>
                    <button
                      type="button"
                      class="btn-transfer"
                      (click)="openTransfer(row.primaryVariant, row.item)"
                    >
                      Trasladar
                    </button>
                  }
                  @if (auth.hasPermission('inventory.edit')) {
                    <a [routerLink]="['/dotacion/inventario', row.item.id, 'editar']" class="link-edit">
                      Editar
                    </a>
                    <button type="button" class="btn-delete" (click)="askDelete(row.item)">
                      Eliminar
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">No hay elementos. Usa “Agregar elemento” para crear el primero.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>

    <app-add-stock-dialog
      [open]="stockDialogOpen()"
      [variant]="stockVariant()"
      [variants]="stockVariants()"
      (completed)="onStockAdded()"
      (dismissed)="closeAddStock()"
    />

    <app-modal-shell
      [open]="transferOpen()"
      title="Trasladar a la otra sede"
      (closed)="closeTransfer()"
    >
      @if (transferVariant(); as v) {
        <p class="confirm-text">
          {{ v.item?.name ?? v.sku }} — {{ sizeLabel(v) }}
        </p>
        <p class="muted">
          Sale de <strong>{{ auth.currentUser()?.warehouse?.name ?? 'tu almacén' }}</strong>
          ({{ v.stockCurrent }} und. en tu sede).
        </p>
        <label class="transfer-qty">
          Cantidad
          <input type="number" min="1" [(ngModel)]="transferQty" name="transferQty" />
        </label>
        @if (transferError()) {
          <p class="error">{{ transferError() }}</p>
        }
        <div class="confirm-actions">
          <button type="button" class="btn-ghost" (click)="closeTransfer()" [disabled]="transferring()">
            Cancelar
          </button>
          <button type="button" class="btn-primary" (click)="confirmTransfer()" [disabled]="transferring()">
            {{ transferring() ? 'Trasladando...' : 'Confirmar traslado' }}
          </button>
        </div>
      }
    </app-modal-shell>

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
    .size-lines {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      margin-top: 0.55rem;
    }
    .size-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .size-group__label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .size-group__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 0.55rem;
    }
    .size-chip {
      font-size: 0.88rem;
      line-height: 1.25;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0.4rem 0.65rem;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.45rem 0.55rem;
    }
    .size-chip__main { font-weight: 600; color: #0f172a; }
    .size-chip__stock { color: #475569; font-variant-numeric: tabular-nums; }
    .size-chip__sep { color: #94a3b8; margin: 0 0.1rem; }
    .chip-btn {
      border: none;
      background: #e2e8f0;
      border-radius: 8px;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.2rem 0.5rem;
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
    .btn-transfer {
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid #c4b5fd;
      border-radius: 8px;
      background: #f5f3ff;
      color: #5b21b6;
      cursor: pointer;
    }
    .transfer-qty {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin: 0.75rem 0;
      font-size: 0.85rem;
    }
    .transfer-qty input {
      padding: 0.5rem 0.7rem;
      border: 1px solid #d4d4d4;
      border-radius: 8px;
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
  readonly auth = inject(AuthService);

  readonly rows = signal<ItemRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stockDialogOpen = signal(false);
  readonly stockVariant = signal<InventoryVariant | null>(null);
  readonly stockVariants = signal<InventoryVariant[]>([]);

  readonly transferOpen = signal(false);
  readonly transferVariant = signal<InventoryVariant | null>(null);
  readonly transferring = signal(false);
  readonly transferError = signal<string | null>(null);
  transferQty = 1;

  readonly deleteDialogOpen = signal(false);
  readonly itemToDelete = signal<InventoryItem | null>(null);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  sizeLabel(v: InventoryVariant): string {
    return this.chipLabel(v, false);
  }

  /** Si ya hay grupo Mujer/Hombre, el chip solo muestra la talla. */
  chipLabel(v: InventoryVariant, grouped: boolean): string {
    const g = genderCode(v);
    const talla = tallaOf(v);
    if (grouped) {
      return talla ? `Talla ${talla}` : v.sku;
    }
    const gender = g === 'M' ? 'Hombre' : g === 'F' ? 'Mujer' : '';
    const parts = [gender, talla ? `Talla ${talla}` : ''].filter(Boolean);
    return parts.length ? parts.join(' · ') : v.sku;
  }

  stockOf(v: InventoryVariant, code: string): number {
    return v.stocks?.find((s) => s.warehouseCode === code)?.quantity ?? 0;
  }

  openAddStock(variant: InventoryVariant, item: InventoryItem, variants?: InventoryVariant[]): void {
    this.stockVariant.set({ ...variant, item });
    this.stockVariants.set(variants?.length ? variants : [variant]);
    this.stockDialogOpen.set(true);
  }

  openTransfer(variant: InventoryVariant, item: InventoryItem): void {
    this.transferVariant.set({ ...variant, item });
    this.transferQty = 1;
    this.transferError.set(null);
    this.transferOpen.set(true);
  }

  closeTransfer(): void {
    if (this.transferring()) return;
    this.transferOpen.set(false);
    this.transferVariant.set(null);
  }

  confirmTransfer(): void {
    const v = this.transferVariant();
    const qty = Number(this.transferQty);
    if (!v || !Number.isFinite(qty) || qty < 1) {
      this.transferError.set('Indica una cantidad válida.');
      return;
    }
    this.transferring.set(true);
    this.transferError.set(null);
    this.api.transferStock({ variantId: v.id, quantity: qty }).subscribe({
      next: () => {
        this.transferring.set(false);
        this.transferOpen.set(false);
        this.transferVariant.set(null);
        this.reload();
      },
      error: (err) => {
        this.transferring.set(false);
        this.transferError.set(err?.error?.message ?? 'No se pudo trasladar.');
      },
    });
  }

  closeAddStock(): void {
    this.stockDialogOpen.set(false);
    this.stockVariant.set(null);
    this.stockVariants.set([]);
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
            const itemVariants = sortVariants(byItem.get(item.id) ?? []);
            return {
              item,
              variants: itemVariants,
              groups: groupVariants(itemVariants),
              stockMedellin: itemVariants.reduce((sum, v) => sum + this.stockOf(v, 'MEDELLIN'), 0),
              stockRionegro: itemVariants.reduce((sum, v) => sum + this.stockOf(v, 'RIONEGRO'), 0),
              primaryVariant: itemVariants[0] ?? null,
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
