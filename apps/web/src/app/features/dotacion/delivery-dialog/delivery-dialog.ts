import { Component, OnInit, ViewChild, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { getTallasDisponibles, requiereTalla } from '../config/tallas.config';
import { InventoryApiService, InventoryItem, InventoryVariant } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';
import { SignaturePad } from '../signature-pad/signature-pad';

interface CategoryOption {
  code: string;
  name: string;
}

interface TallaOption {
  talla: string;
  genero: string | null;
  stock: number;
  variantId: string;
  label: string;
}

@Component({
  selector: 'app-delivery-dialog',
  imports: [ModalShell, ReactiveFormsModule, SignaturePad],
  template: `
    <app-modal-shell [open]="open()" [title]="dialogTitle()" (closed)="dismiss()">
      @if (loading()) {
        <p>Cargando inventario...</p>
      } @else {
        <p class="subject">{{ subjectLabel() }}</p>

        <form [formGroup]="form">
          <h4>Elementos a entregar</h4>
          <div formArrayName="lines" class="lines">
            @for (line of lines.controls; track $index; let i = $index) {
              <div class="line" [formGroupName]="i">
                <select formControlName="category" (change)="onCategoryChange(i)">
                  <option value="">Categoría...</option>
                  @for (c of categories(); track c.code) {
                    <option [value]="c.code">{{ c.name }}</option>
                  }
                </select>

                @if (lineNeedsTalla(i)) {
                  <select formControlName="tallaKey" (change)="onTallaChange(i)">
                    <option value="">Talla / género...</option>
                    @for (opt of tallaOptions(i); track opt.variantId) {
                      <option [value]="opt.talla + '|' + (opt.genero ?? 'N/A')">{{ opt.label }}</option>
                    }
                  </select>
                }

                <input formControlName="quantity" type="number" min="1" max="99" placeholder="Cant." />
                @if (stockHint(i) !== null) {
                  <span class="stock-badge" [class.low]="stockHint(i) === 0">{{ stockHint(i) === 0 ? 'Sin stock' : 'Stock: ' + stockHint(i) }}</span>
                }
                <button type="button" class="btn-remove" (click)="removeLine(i)" [disabled]="lines.length === 1">×</button>
              </div>
            }
          </div>
          <button type="button" class="btn-add" (click)="addLine()">+ Agregar línea</button>

          <label class="obs">
            Observaciones
            <textarea formControlName="observations" rows="2" placeholder="Opcional"></textarea>
          </label>

          <h4>Firma de recepción</h4>
          <app-signature-pad #signaturePad />
        </form>

        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" (click)="dismiss()">Cancelar</button>
          <button type="button" (click)="submit()" [disabled]="saving() || !canSubmit()">
            {{ saving() ? 'Guardando...' : 'Confirmar entrega' }}
          </button>
        </div>
      }
    </app-modal-shell>
  `,
  styles: `
    .subject { margin: 0 0 1rem; color: var(--coraza-text-muted); }
    h4 { margin: 1rem 0 0.5rem; font-size: 0.95rem; color: var(--primary-dark); }
    .lines { display: flex; flex-direction: column; gap: 0.5rem; }
    .line {
      display: grid;
      grid-template-columns: 1fr 1fr 80px auto auto;
      gap: 0.5rem;
      align-items: center;
    }
    @media (max-width: 640px) {
      .line { grid-template-columns: 1fr; }
    }
    select, input, textarea {
      padding: 0.45rem 0.5rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      width: 100%;
    }
    .stock-badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.45rem;
      border-radius: 999px;
      background: #d4edda;
      white-space: nowrap;
    }
    .stock-badge.low { background: #f8d7da; }
    .btn-remove {
      border: none;
      background: transparent;
      color: var(--coraza-error);
      font-size: 1.25rem;
      cursor: pointer;
    }
    .btn-add {
      margin-top: 0.5rem;
      padding: 0.35rem 0.75rem;
      border: 1px dashed var(--coraza-border);
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
    }
    .obs { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 1rem; }
    .actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class DeliveryDialog implements OnInit {
  @ViewChild('signaturePad') signaturePad!: SignaturePad;

  readonly open = input(false);
  readonly associateId = input<string | null>(null);
  readonly postId = input<string | null>(null);
  readonly subjectLabel = input('');
  readonly completed = output<void>();
  readonly dismissed = output<void>();

  private readonly api = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<CategoryOption[]>([]);
  private items = signal<InventoryItem[]>([]);
  private variants = signal<InventoryVariant[]>([]);
  private tallaOptionsByLine = signal<Record<number, TallaOption[]>>({});
  private stockByLine = signal<Record<number, number | null>>({});

  readonly form = this.fb.nonNullable.group({
    observations: [''],
    lines: this.fb.array([this.createLineGroup()]),
  });

  readonly dialogTitle = signal('Entrega de dotación');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
        this.loadCatalog();
        this.dialogTitle.set(
          this.postId() ? 'Entrega de dotación — Puesto' : 'Entrega de dotación — Asociado',
        );
      }
    });
  }

  ngOnInit(): void {
    // catalog loads when dialog opens via effect
  }

  get lines(): FormArray {
    return this.form.controls.lines;
  }

  private createLineGroup() {
    return this.fb.nonNullable.group({
      category: ['', Validators.required],
      tallaKey: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  addLine(): void {
    this.lines.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.lines.length <= 1) return;
    this.lines.removeAt(index);
    this.refreshLineMaps();
  }

  lineNeedsTalla(index: number): boolean {
    const category = this.lines.at(index)?.get('category')?.value ?? '';
    return requiereTalla(category);
  }

  tallaOptions(index: number): TallaOption[] {
    return this.tallaOptionsByLine()[index] ?? [];
  }

  stockHint(index: number): number | null {
    return this.stockByLine()[index] ?? null;
  }

  onCategoryChange(index: number): void {
    const category = this.lines.at(index)?.get('category')?.value ?? '';
    this.lines.at(index)?.patchValue({ tallaKey: '' });
    this.updateTallaOptions(index, category);
    if (!requiereTalla(category)) {
      this.updateStockForLine(index, category);
    } else {
      this.patchStock(index, null);
    }
  }

  onTallaChange(index: number): void {
    const line = this.lines.at(index);
    if (!line) return;
    const category = line.get('category')?.value ?? '';
    const tallaKey = line.get('tallaKey')?.value ?? '';
    if (!tallaKey) {
      this.patchStock(index, null);
      return;
    }
    const [talla, generoRaw] = tallaKey.split('|');
    const genero = generoRaw === 'N/A' ? null : generoRaw;
    const opt = this.tallaOptions(index).find(
      (o) => o.talla === talla && (o.genero ?? 'N/A') === (genero ?? 'N/A'),
    );
    this.patchStock(index, opt?.stock ?? 0);
  }

  canSubmit(): boolean {
    if (!this.associateId() && !this.postId()) return false;
    if (this.form.invalid) return false;
    if (this.signaturePad?.isEmpty()) return false;
    return this.lines.controls.every((ctrl, i) => {
      const category = ctrl.get('category')?.value;
      if (!category) return false;
      if (requiereTalla(category) && !ctrl.get('tallaKey')?.value) return false;
      const stock = this.stockHint(i);
      const qty = Number(ctrl.get('quantity')?.value ?? 0);
      return stock !== null && stock >= qty && qty > 0;
    });
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);
    this.error.set(null);

    const elementos = this.lines.controls.map((ctrl) => {
      const category = ctrl.get('category')!.value;
      const tallaKey = ctrl.get('tallaKey')!.value;
      const [talla, generoRaw] = tallaKey ? tallaKey.split('|') : [undefined, undefined];
      return {
        category,
        talla: requiereTalla(category) ? talla : undefined,
        genero: requiereTalla(category) && generoRaw && generoRaw !== 'N/A' ? generoRaw : undefined,
        quantity: Number(ctrl.get('quantity')!.value),
      };
    });

    this.api.validateStock(elementos).subscribe({
      next: (validation) => {
        if (!validation.valid) {
          this.saving.set(false);
          this.error.set('Stock insuficiente para uno o más ítems');
          return;
        }

        const items = validation.validations
          .filter((v) => v.variantId)
          .map((v) => ({ variantId: v.variantId!, quantity: v.quantity }));

        const payload = {
          observations: this.form.controls.observations.value.trim() || undefined,
          items,
          ...(this.associateId() ? { associateId: this.associateId()! } : {}),
          ...(this.postId() ? { postId: this.postId()! } : {}),
        };

        this.api.createDelivery(payload).subscribe({
          next: (delivery) => {
            const signature = this.signaturePad.exportDataUrl();
            if (!signature) {
              this.saving.set(false);
              this.error.set('La firma es obligatoria');
              return;
            }
            this.api.signDelivery(delivery.id, signature).subscribe({
              next: () => {
                this.saving.set(false);
                this.completed.emit();
              },
              error: () => {
                this.saving.set(false);
                this.error.set('Entrega creada pero no se pudo registrar la firma');
              },
            });
          },
          error: (err) => {
            this.saving.set(false);
            this.error.set(err?.error?.message ?? 'No se pudo crear la entrega');
          },
        });
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo validar el stock');
      },
    });
  }

  dismiss(): void {
    this.dismissed.emit();
  }

  private resetForm(): void {
    this.form.reset({ observations: '' });
    this.lines.clear();
    this.lines.push(this.createLineGroup());
    this.error.set(null);
    this.tallaOptionsByLine.set({});
    this.stockByLine.set({});
  }

  private loadCatalog(): void {
    this.loading.set(true);
    forkJoin({
      items: this.api.listItems(),
      variants: this.api.listVariants(),
    }).subscribe({
      next: ({ items, variants }) => {
        this.items.set(items);
        this.variants.set(variants);
        this.categories.set(this.buildCategories(items, variants));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el inventario');
      },
    });
  }

  private buildCategories(items: InventoryItem[], variants: InventoryVariant[]): CategoryOption[] {
    const withStock = new Set(
      variants.filter((v) => v.stockCurrent > 0).map((v) => v.itemId),
    );
    const map = new Map<string, string>();
    for (const item of items) {
      if (!withStock.has(item.id)) continue;
      const code = item.category?.code ?? item.code;
      const name = item.category?.name ?? item.name;
      map.set(code.toLowerCase(), name);
    }
    return [...map.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private updateTallaOptions(index: number, category: string): void {
    if (!requiereTalla(category)) {
      const next = { ...this.tallaOptionsByLine() };
      next[index] = [];
      this.tallaOptionsByLine.set(next);
      return;
    }

    const categoryKey = category.toLowerCase();
    const allowedTallas = new Set(getTallasDisponibles(categoryKey));
    const options: TallaOption[] = [];

    for (const variant of this.variants()) {
      if (variant.stockCurrent <= 0) continue;
      const item = this.items().find((i) => i.id === variant.itemId);
      if (!item) continue;
      const itemCategory = (item.category?.code ?? item.name).toLowerCase();
      if (itemCategory !== categoryKey && !item.name.toLowerCase().includes(categoryKey)) {
        continue;
      }
      const talla = String(variant.attributes['talla'] ?? '').trim();
      if (!talla || (allowedTallas.size > 0 && !allowedTallas.has(talla))) continue;
      const genero = variant.attributes['genero'] != null ? String(variant.attributes['genero']) : null;
      const generoLabel =
        genero === 'F' ? 'Mujer' : genero === 'M' ? 'Hombre' : '';
      options.push({
        talla,
        genero,
        stock: variant.stockCurrent,
        variantId: variant.id,
        label: `Talla ${talla}${generoLabel ? ` — ${generoLabel}` : ''} (Stock: ${variant.stockCurrent})`,
      });
    }

    options.sort((a, b) => a.talla.localeCompare(b.talla, undefined, { numeric: true }));
    const next = { ...this.tallaOptionsByLine() };
    next[index] = options;
    this.tallaOptionsByLine.set(next);
  }

  private updateStockForLine(index: number, category: string): void {
    this.api.availableStock(category).subscribe({
      next: (res) => this.patchStock(index, res.quantity),
      error: () => this.patchStock(index, 0),
    });
  }

  private patchStock(index: number, stock: number | null): void {
    const next = { ...this.stockByLine() };
    next[index] = stock;
    this.stockByLine.set(next);
  }

  private refreshLineMaps(): void {
    this.lines.controls.forEach((_, i) => {
      const category = this.lines.at(i)?.get('category')?.value ?? '';
      if (category) {
        this.onCategoryChange(i);
      }
    });
  }
}
