import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  InventoryApiService,
  InventoryCategory,
  InventoryVariant,
} from '../inventory-api.service';

@Component({
  selector: 'app-inventory-form',
  imports: [ReactiveFormsModule],
  template: `
    <section>
      <h2>{{ title() }}</h2>
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <form [formGroup]="form" (ngSubmit)="saveItem()">
        <div class="grid">
          <label>Categoría
            <select formControlName="categoryId">
              <option value="">Seleccione...</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }} ({{ c.code }})</option>
              }
            </select>
          </label>
          <label>Código<input formControlName="code" /></label>
          <label>Nombre<input formControlName="name" /></label>
          <label>Unidad<input formControlName="unit" placeholder="und, par..." /></label>
          <label>Umbral stock bajo<input formControlName="lowStockThreshold" type="number" min="0" /></label>
        </div>
        <div class="actions">
          <button type="button" (click)="cancel()">Cancelar</button>
          <button type="submit" [disabled]="form.invalid || saving()">Guardar ítem</button>
        </div>
      </form>

      @if (itemId()) {
        <hr />
        <h3>Variantes</h3>
        @if (variants().length) {
          <ul>
            @for (v of variants(); track v.id) {
              <li>{{ v.sku }} — stock: {{ v.stockCurrent }}</li>
            }
          </ul>
        }

        <form [formGroup]="variantForm" (ngSubmit)="addVariant()" class="variant-form">
          <div class="grid">
            <label>SKU<input formControlName="sku" /></label>
            <label>Talla<input formControlName="talla" /></label>
            <label>Color<input formControlName="color" /></label>
            <label>Stock inicial<input formControlName="initialStock" type="number" min="0" /></label>
          </div>
          <button type="submit" [disabled]="variantForm.invalid || saving()">Agregar variante</button>
        </form>
      }
    </section>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
    input, select { padding: 0.5rem; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .actions { margin-top: 1rem; display: flex; gap: 0.5rem; }
    .variant-form { margin-top: 1rem; }
    hr { margin: 1.5rem 0; border: none; border-top: 1px solid var(--coraza-border); }
    .error { color: var(--coraza-error); }
  `,
})
export class InventoryForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly itemId = signal<string | null>(null);
  readonly categories = signal<InventoryCategory[]>([]);
  readonly variants = signal<InventoryVariant[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly title = computed(() => (this.itemId() ? 'Editar ítem' : 'Nuevo ítem'));

  readonly form = this.fb.nonNullable.group({
    categoryId: ['', Validators.required],
    code: ['', Validators.required],
    name: ['', Validators.required],
    unit: ['und', Validators.required],
    lowStockThreshold: [0, [Validators.min(0)]],
  });

  readonly variantForm = this.fb.nonNullable.group({
    sku: ['', Validators.required],
    talla: [''],
    color: [''],
    initialStock: [0, [Validators.min(0)]],
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

    const payload = this.form.getRawValue();
    const id = this.itemId();

    const req = id
      ? this.api.updateItem(id, payload)
      : this.api.createItem(payload);

    req.subscribe({
      next: (item) => {
        this.saving.set(false);
        if (!id) {
          this.router.navigate(['/dotacion/inventario', item.id, 'editar']);
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar el ítem');
      },
    });
  }

  addVariant(): void {
    const itemId = this.itemId();
    if (!itemId || this.variantForm.invalid) return;

    const { sku, talla, color, initialStock } = this.variantForm.getRawValue();
    const attributes: Record<string, unknown> = {};
    if (talla) attributes['talla'] = talla;
    if (color) attributes['color'] = color;

    this.saving.set(true);
    this.api.createVariant({ itemId, sku, attributes }).subscribe({
      next: (variant) => {
        if (initialStock > 0) {
          this.api
            .registerMovement({
              variantId: variant.id,
              movementType: 'IN',
              quantity: initialStock,
              reason: 'Stock inicial',
            })
            .subscribe({
              next: () => {
                this.saving.set(false);
                this.variantForm.reset({ sku: '', talla: '', color: '', initialStock: 0 });
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
          this.variantForm.reset({ sku: '', talla: '', color: '', initialStock: 0 });
          this.loadVariants(itemId);
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo crear la variante');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dotacion']);
  }

  private loadItem(id: string): void {
    this.api.listItems().subscribe({
      next: (items) => {
        const item = items.find((i) => i.id === id);
        if (!item) {
          this.error.set('Ítem no encontrado');
          return;
        }
        this.form.patchValue({
          categoryId: item.categoryId,
          code: item.code,
          name: item.name,
          unit: item.unit,
          lowStockThreshold: item.lowStockThreshold,
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
