import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { InventoryApiService, InventoryItem, InventoryVariant } from '../inventory-api.service';

interface ItemRow {
  item: InventoryItem;
  variants: InventoryVariant[];
  totalStock: number;
}

@Component({
  selector: 'app-inventory-list',
  imports: [RouterLink],
  template: `
    <section>
      <header>
        <h2>Dotación — Inventario</h2>
        <p>Ítems, variantes y stock disponible.</p>
        <div class="header-actions">
          <a routerLink="/dotacion/inventario/nuevo">Nuevo ítem</a>
          <a routerLink="/dotacion/entregas">Ver entregas</a>
        </div>
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
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); font-weight: 600; }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    .header-actions { display: flex; gap: 1rem; margin-bottom: 1rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border-radius: var(--coraza-radius);
      overflow: hidden;
      border: 1px solid var(--coraza-border);
      box-shadow: var(--coraza-shadow);
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
    .variant-line { font-size: 0.85rem; }
    .muted { color: var(--coraza-text-muted); font-size: 0.85rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class InventoryList implements OnInit {
  private readonly api = inject(InventoryApiService);

  readonly rows = signal<ItemRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
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

  formatAttributes(attrs: Record<string, unknown>): string {
    const entries = Object.entries(attrs ?? {});
    if (!entries.length) return '';
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ');
  }
}
