import { Component, OnInit, ViewChild, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InventoryApiService, InventoryItem, InventoryVariant } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';
import { SignaturePad } from '../signature-pad/signature-pad';

interface ItemOption {
  id: string;
  name: string;
}

interface VariantOption {
  variantId: string;
  label: string;
  stock: number;
}

function stockOf(v: InventoryVariant): number {
  if (v.stockOwn != null) return Number(v.stockOwn);
  return Number(v.stockCurrent ?? 0);
}

function variantLabel(v: InventoryVariant): string {
  const talla = String(v.talla ?? v.attributes?.['talla'] ?? '').trim();
  const generoRaw = v.genero ?? (v.attributes?.['genero'] != null ? String(v.attributes['genero']) : '');
  const genero =
    generoRaw === 'M' || generoRaw === 'Hombre'
      ? 'Hombre'
      : generoRaw === 'F' || generoRaw === 'Mujer'
        ? 'Mujer'
        : '';
  const parts = [
    talla ? `Talla ${talla}` : null,
    genero || null,
  ].filter(Boolean);
  const base = parts.length ? parts.join(' — ') : 'Única';
  return `${base} (Stock: ${stockOf(v)})`;
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
                <select formControlName="itemId" (change)="onItemChange(i)">
                  <option value="">Elemento...</option>
                  @for (it of itemOptions(); track it.id) {
                    <option [value]="it.id">{{ it.name }}</option>
                  }
                </select>

                @if (variantOptions(i).length > 1) {
                  <select formControlName="variantId" (change)="onVariantChange(i)">
                    <option value="">Talla / variante...</option>
                    @for (opt of variantOptions(i); track opt.variantId) {
                      <option [value]="opt.variantId">{{ opt.label }}</option>
                    }
                  </select>
                } @else if (variantOptions(i).length === 1) {
                  <span class="variant-fixed">{{ variantOptions(i)[0].label }}</span>
                } @else if (line.get('itemId')?.value) {
                  <span class="stock-badge low">Sin stock en tu almacén</span>
                }

                <input formControlName="quantity" type="number" min="1" max="99" placeholder="Cant." />
                @if (stockHint(i) !== null) {
                  <span class="stock-badge" [class.low]="stockHint(i) === 0">
                    {{ stockHint(i) === 0 ? 'Sin stock' : 'Stock: ' + stockHint(i) }}
                  </span>
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
          <app-signature-pad #signaturePad (inkChange)="onInkChange($event)" />
        </form>

        @if (submitBlockReason(); as why) {
          <p class="hint-block">{{ why }}</p>
        }
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }

        <div class="actions">
          <button type="button" (click)="dismiss()">Cancelar</button>
          <button type="button" class="btn-confirm" (click)="submit()" [disabled]="saving()">
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
      grid-template-columns: 1.2fr 1.4fr 80px auto auto;
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
    .variant-fixed {
      font-size: 0.85rem;
      color: #334155;
      padding: 0.35rem 0.5rem;
      background: #f1f5f9;
      border-radius: 8px;
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
    .btn-confirm {
      padding: 0.55rem 1rem;
      border: none;
      border-radius: 8px;
      background: var(--primary, #1d4ed8);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-confirm:disabled { opacity: 0.55; cursor: not-allowed; }
    .error { color: var(--coraza-error); }
    .hint-block {
      margin: 0.75rem 0 0;
      padding: 0.55rem 0.75rem;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      color: #9a3412;
      font-size: 0.85rem;
    }
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
  readonly signed = signal(false);
  readonly itemOptions = signal<ItemOption[]>([]);
  private items = signal<InventoryItem[]>([]);
  private variants = signal<InventoryVariant[]>([]);
  private variantsByLine = signal<Record<number, VariantOption[]>>({});
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
      itemId: ['', Validators.required],
      variantId: ['', Validators.required],
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

  variantOptions(index: number): VariantOption[] {
    return this.variantsByLine()[index] ?? [];
  }

  stockHint(index: number): number | null {
    return this.stockByLine()[index] ?? null;
  }

  onInkChange(hasInk: boolean): void {
    this.signed.set(hasInk);
  }

  onItemChange(index: number): void {
    const itemId = this.lines.at(index)?.get('itemId')?.value ?? '';
    const options = this.buildVariantOptions(itemId);
    const next = { ...this.variantsByLine() };
    next[index] = options;
    this.variantsByLine.set(next);

    const autoId = options.length === 1 ? options[0].variantId : '';
    this.lines.at(index)?.patchValue({ variantId: autoId });
    this.patchStock(index, autoId ? options[0]?.stock ?? 0 : null);
  }

  onVariantChange(index: number): void {
    const variantId = this.lines.at(index)?.get('variantId')?.value ?? '';
    const opt = this.variantOptions(index).find((o) => o.variantId === variantId);
    this.patchStock(index, opt ? opt.stock : null);
  }

  /** Motivo visible de por qué aún no se puede confirmar. */
  submitBlockReason(): string | null {
    if (!this.associateId() && !this.postId()) {
      return 'Selecciona un asociado o puesto antes de entregar.';
    }
    for (let i = 0; i < this.lines.length; i++) {
      const ctrl = this.lines.at(i);
      const itemId = ctrl.get('itemId')?.value;
      const variantId = ctrl.get('variantId')?.value;
      const qty = Number(ctrl.get('quantity')?.value ?? 0);
      if (!itemId) return 'Selecciona el elemento a entregar.';
      if (!variantId) return 'Selecciona la talla / variante.';
      const stock = this.stockHint(i);
      if (stock === null) return 'Selecciona talla / variante para ver el stock.';
      if (stock <= 0) return 'No hay stock disponible para esa variante.';
      if (!Number.isFinite(qty) || qty < 1) return 'Indica una cantidad válida.';
      if (qty > stock) return `La cantidad supera el stock (${stock}).`;
    }
    if (!this.signed() && (this.signaturePad?.isEmpty() ?? true)) {
      return 'Falta la firma del asociado que recibe.';
    }
    return null;
  }

  canSubmit(): boolean {
    return this.submitBlockReason() === null;
  }

  submit(): void {
    const why = this.submitBlockReason();
    if (why) {
      this.error.set(why);
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const items = this.lines.controls.map((ctrl) => ({
      variantId: String(ctrl.get('variantId')!.value),
      quantity: Number(ctrl.get('quantity')!.value),
    }));

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
          error: (err) => {
            this.saving.set(false);
            this.error.set(
              err?.error?.message ?? 'Entrega creada pero no se pudo confirmar (firma/stock)',
            );
          },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'No se pudo crear la entrega');
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
    this.signed.set(false);
    this.variantsByLine.set({});
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
        this.itemOptions.set(this.buildItemOptions(items, variants));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el inventario');
      },
    });
  }

  private buildItemOptions(items: InventoryItem[], variants: InventoryVariant[]): ItemOption[] {
    const withStock = new Set(
      variants.filter((v) => stockOf(v) > 0).map((v) => v.itemId),
    );
    return items
      .filter((item) => withStock.has(item.id))
      .map((item) => ({ id: item.id, name: item.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  private buildVariantOptions(itemId: string): VariantOption[] {
    if (!itemId) return [];
    const options = this.variants()
      .filter((v) => v.itemId === itemId && stockOf(v) > 0)
      .map((v) => ({
        variantId: v.id,
        label: variantLabel(v),
        stock: stockOf(v),
      }));

    return options.sort((a, b) => a.label.localeCompare(b.label, 'es', { numeric: true }));
  }

  private patchStock(index: number, stock: number | null): void {
    const next = { ...this.stockByLine() };
    next[index] = stock;
    this.stockByLine.set(next);
  }

  private refreshLineMaps(): void {
    this.lines.controls.forEach((_, i) => {
      const itemId = this.lines.at(i)?.get('itemId')?.value ?? '';
      if (itemId) this.onItemChange(i);
    });
  }
}
