import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  InventoryApiService,
  InventoryCategory,
  InventoryVariant,
} from '../inventory-api.service';
import { ENTRY_REASONS } from '../add-stock-dialog/add-stock-dialog';

/**
 * Alta simple al estilo de la app de almacén:
 * nombre + categoría + stock (el código lo asigna el sistema).
 * En edición se pueden agregar tallas/variantes si hace falta.
 */
@Component({
  selector: 'app-inventory-form',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="inv-form">
      <header class="inv-form__head">
        <div>
          <p class="eyebrow"><a routerLink="/dotacion/inventario">Inventario</a></p>
          <h2>{{ title() }}</h2>
          <p class="hint">
            @if (!itemId()) {
              Escribe el nombre del elemento. El código se asigna solo.
            } @else {
              Código del sistema: <strong>{{ assignedCode() || '—' }}</strong>
            }
          </p>
        </div>
      </header>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="saveItem()" class="card">
        <label class="field-name">
          Nombre del elemento *
          <input
            formControlName="name"
            placeholder="Ej. Botas, Camisa, Chaleco..."
            autofocus
          />
        </label>

        <div class="grid">
          <label>
            Categoría *
            <select formControlName="categoryId">
              <option value="">Seleccione...</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
            @if (!categories().length) {
              <small class="field-warn">No hay categorías. Ejecuta el seed de Uniforme / Accesorio.</small>
            }
          </label>

          <label>
            Stock mínimo
            <input formControlName="lowStockThreshold" type="number" min="0" />
          </label>

          @if (!itemId()) {
            <label>
              Cantidad inicial
              <input formControlName="initialStock" type="number" min="0" />
            </label>
            @if ((form.controls.initialStock.value ?? 0) > 0) {
              <label>
                Motivo de entrada *
                <select formControlName="initialStockReason">
                  <option value="">Seleccione...</option>
                  @for (r of entryReasons; track r) {
                    <option [value]="r">{{ r }}</option>
                  }
                </select>
              </label>
            }
          }
        </div>

        @if (!itemId()) {
          <p class="auto-code">Código: se genera automáticamente al guardar (ej. BOT001).</p>
        }

        <div class="actions">
          <button type="button" class="btn-ghost" (click)="cancel()">Cancelar</button>
          <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Guardando...' : itemId() ? 'Guardar cambios' : 'Agregar elemento' }}
          </button>
        </div>
      </form>

      @if (itemId()) {
        <section class="card variants">
          <h3>Tallas / variantes (opcional)</h3>
          <p class="hint">
            Solo si el elemento maneja tallas o colores. El stock principal ya está en la variante
            por defecto (mismo código del elemento).
          </p>

          @if (variants().length) {
            <ul class="variant-list">
              @for (v of variants(); track v.id) {
                <li>
                  <strong>{{ v.sku }}</strong>
                  <span>stock {{ v.stockCurrent }}</span>
                  @if (attrsLabel(v)) {
                    <span class="muted">{{ attrsLabel(v) }}</span>
                  }
                </li>
              }
            </ul>
          }

          <form [formGroup]="variantForm" (ngSubmit)="addVariant()" class="variant-form">
            <div class="grid">
              <label>Talla<input formControlName="talla" placeholder="Ej. M, 40..." /></label>
              <label>Color<input formControlName="color" placeholder="Opcional" /></label>
              <label>Stock inicial<input formControlName="initialStock" type="number" min="0" /></label>
              @if ((variantForm.controls.initialStock.value ?? 0) > 0) {
                <label>
                  Motivo de entrada *
                  <select formControlName="entryReason">
                    <option value="">Seleccione...</option>
                    @for (r of entryReasons; track r) {
                      <option [value]="r">{{ r }}</option>
                    }
                  </select>
                </label>
              }
            </div>
            <button type="submit" class="btn-ghost" [disabled]="saving()">
              Agregar talla
            </button>
          </form>
        </section>
      }
    </section>
  `,
  styles: `
    .inv-form { max-width: 40rem; }
    .inv-form__head { margin-bottom: 1rem; }
    .eyebrow {
      margin: 0 0 0.25rem;
      font-size: 0.8rem;
    }
    .eyebrow a { color: var(--text-muted, #737373); text-decoration: none; }
    h2 { margin: 0 0 0.35rem; font-size: 1.35rem; }
    .hint { margin: 0; color: var(--text-muted, #737373); font-size: 0.9rem; }
    .card {
      background: var(--surface, #fff);
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }
    .field-name {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 1rem;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .field-name input {
      padding: 0.75rem 0.9rem;
      font-size: 1.05rem;
      border: 1px solid var(--border, #d4d4d4);
      border-radius: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.85rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: var(--text-secondary, #525252);
    }
    input, select {
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--border, #d4d4d4);
      border-radius: 8px;
      font: inherit;
      background: #fff;
    }
    .auto-code {
      margin: 0.85rem 0 0;
      font-size: 0.85rem;
      color: var(--primary, #1d4ed8);
      background: color-mix(in srgb, var(--primary, #1d4ed8) 8%, transparent);
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
    }
    .actions {
      margin-top: 1.25rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
    }
    .btn-primary, .btn-ghost {
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: var(--primary, #1d4ed8);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border, #d4d4d4);
      color: inherit;
    }
    .variants h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }
    .variant-list {
      list-style: none;
      padding: 0;
      margin: 0.75rem 0;
    }
    .variant-list li {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border, #eee);
      font-size: 0.9rem;
    }
    .muted { color: var(--text-muted, #737373); }
    .variant-form { margin-top: 0.75rem; }
    .error { color: #b91c1c; }
    .field-warn { color: #b45309; margin-top: 0.25rem; font-size: 0.8rem; }
  `,
})
export class InventoryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly itemId = signal<string | null>(null);
  readonly assignedCode = signal<string>('');
  readonly categories = signal<InventoryCategory[]>([]);
  readonly variants = signal<InventoryVariant[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly title = computed(() => (this.itemId() ? 'Editar elemento' : 'Agregar elemento'));

  readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    name: ['', [Validators.required, Validators.minLength(2)]],
    lowStockThreshold: [10, [Validators.min(0)]],
    initialStock: [0, [Validators.min(0)]],
    initialStockReason: [''],
  });

  readonly entryReasons = ENTRY_REASONS;

  readonly variantForm = this.fb.nonNullable.group({
    talla: [''],
    color: [''],
    initialStock: [0, [Validators.min(0)]],
    entryReason: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.itemId.set(id);
      this.loadItem(id);
      this.loadVariants(id);
    }

    this.api.listCategories().subscribe({
      next: (cats) => this.categories.set(cats),
      error: () => this.error.set('No se pudieron cargar categorías'),
    });
  }

  saveItem(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);

    const { categoryId, name, lowStockThreshold, initialStock, initialStockReason } =
      this.form.getRawValue();
    const id = this.itemId();

    if (id) {
      this.api
        .updateItem(id, { categoryId, name, lowStockThreshold })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.router.navigate(['/dotacion/inventario']);
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(err?.error?.message ?? 'No se pudo guardar el elemento');
          },
        });
      return;
    }

    if (initialStock > 0 && !initialStockReason.trim()) {
      this.saving.set(false);
      this.error.set('Selecciona el motivo de entrada para el stock inicial.');
      return;
    }

    this.api
      .createItem({
        categoryId,
        name,
        lowStockThreshold,
        initialStock: initialStock > 0 ? initialStock : undefined,
        initialStockReason: initialStock > 0 ? initialStockReason.trim() : undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/dotacion/inventario']);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'No se pudo crear el elemento');
        },
      });
  }

  addVariant(): void {
    const itemId = this.itemId();
    const code = this.assignedCode();
    if (!itemId || !code) return;

    const { talla, color, initialStock, entryReason } = this.variantForm.getRawValue();
    if (!talla.trim() && !color.trim()) {
      this.error.set('Indica al menos talla o color para la variante');
      return;
    }
    if (initialStock > 0 && !entryReason.trim()) {
      this.error.set('Selecciona el motivo de entrada para el stock de la talla.');
      return;
    }

    const attributes: Record<string, unknown> = {};
    if (talla.trim()) attributes['talla'] = talla.trim();
    if (color.trim()) attributes['color'] = color.trim();

    const suffix = [talla.trim(), color.trim()].filter(Boolean).join('-').toUpperCase();
    const sku = `${code}-${suffix}`.slice(0, 80);

    this.saving.set(true);
    this.error.set(null);
    this.api.createVariant({
      itemId,
      sku,
      attributes,
      talla: talla.trim() || undefined,
      color: color.trim() || undefined,
    }).subscribe({
      next: (variant) => {
        if (initialStock > 0) {
          this.api
            .registerMovement({
              variantId: variant.id,
              movementType: 'IN',
              quantity: initialStock,
              entryReason: entryReason.trim(),
            })
            .subscribe({
              next: () => {
                this.saving.set(false);
                this.variantForm.reset({
                  talla: '',
                  color: '',
                  initialStock: 0,
                  entryReason: '',
                });
                this.loadVariants(itemId);
              },
              error: () => {
                this.saving.set(false);
                this.error.set('Variante creada pero falló el stock inicial');
                this.loadVariants(itemId);
              },
            });
        } else {
          this.saving.set(false);
          this.variantForm.reset({
            talla: '',
            color: '',
            initialStock: 0,
            entryReason: '',
          });
          this.loadVariants(itemId);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo crear la variante');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dotacion/inventario']);
  }

  attrsLabel(v: InventoryVariant): string {
    const entries = Object.entries(v.attributes ?? {});
    if (!entries.length) return 'Principal';
    return entries.map(([k, val]) => `${k}: ${String(val)}`).join(', ');
  }

  private loadItem(id: string): void {
    this.api.listItems().subscribe({
      next: (items) => {
        const item = items.find((i) => i.id === id);
        if (!item) {
          this.error.set('Elemento no encontrado');
          return;
        }
        this.assignedCode.set(item.code);
        this.form.patchValue({
          categoryId: item.categoryId,
          name: item.name,
          lowStockThreshold: item.lowStockThreshold,
          initialStock: 0,
        });
      },
    });
  }

  private loadVariants(itemId: string): void {
    this.api.listVariants(itemId).subscribe({
      next: (variants) => this.variants.set(variants),
    });
  }
}
