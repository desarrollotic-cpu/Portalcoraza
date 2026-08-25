import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap } from 'rxjs';
import { getTallasDisponibles } from '../config/tallas.config';
import { InventoryApiService, InventoryVariant } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';

/** Motivos de entrada de stock (obligatorio al agregar). */
export const ENTRY_REASONS = [
  'Compra',
  'Devolución',
  'Donación',
  'Ajuste de inventario',
  'Otro',
] as const;

function genderCode(raw: string | null | undefined): 'M' | 'F' | '' {
  const s = String(raw ?? '').trim();
  if (s === 'M' || s.toLowerCase() === 'hombre') return 'M';
  if (s === 'F' || s.toLowerCase() === 'mujer') return 'F';
  return '';
}

function variantTalla(v: InventoryVariant): string {
  return String(v.talla ?? v.attributes?.['talla'] ?? '').trim();
}

function variantGenero(v: InventoryVariant): 'M' | 'F' | '' {
  return genderCode(v.genero ?? (v.attributes?.['genero'] != null ? String(v.attributes['genero']) : ''));
}

@Component({
  selector: 'app-add-stock-dialog',
  imports: [ModalShell, ReactiveFormsModule],
  template: `
    <app-modal-shell
      [open]="open()"
      [title]="'Agregar Stock'"
      (closed)="dismissed.emit()"
    >
      @if (variant(); as v) {
        <div class="item-summary">
          <strong class="item-name">{{ v.item?.name ?? v.sku }}</strong>
          <div class="meta">
            <span>Código: <code>{{ v.item?.code ?? v.sku }}</code></span>
            <span class="stock-ok">Stock en tu almacén: {{ displayStock() }} unidades</span>
            @if ((v.item?.lowStockThreshold ?? 0) > 0) {
              <span>Stock mínimo: {{ v.item?.lowStockThreshold }} unidades</span>
            }
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="row">
            <label>
              Género *
              <select formControlName="genero">
                <option value="">Seleccione...</option>
                <option value="M">Hombre</option>
                <option value="F">Mujer</option>
              </select>
            </label>
            <label>
              Talla *
              @if (tallaOptions().length) {
                <select formControlName="talla">
                  <option value="">Seleccione...</option>
                  @for (t of tallaOptions(); track t) {
                    <option [value]="t">{{ t }}</option>
                  }
                </select>
              } @else {
                <input formControlName="talla" placeholder="Ej. M, 40..." />
              }
            </label>
          </div>
          <label>
            Cantidad a agregar *
            <input formControlName="quantity" type="number" min="1" max="9999" inputmode="numeric" />
          </label>
          <label>
            Motivo de entrada *
            <select formControlName="reasonPreset">
              <option value="">Seleccione el motivo...</option>
              @for (r of reasons; track r) {
                <option [value]="r">{{ r }}</option>
              }
            </select>
          </label>
          <label>
            Observaciones (opcional)
            <textarea formControlName="notes" rows="2" placeholder="Notas adicionales..."></textarea>
          </label>

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }

          <div class="actions">
            <button type="button" class="btn-ghost" (click)="dismissed.emit()">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Guardando...' : 'Confirmar entrada' }}
            </button>
          </div>
        </form>
      }
    </app-modal-shell>
  `,
  styles: `
    .item-summary {
      margin: 0 0 1rem;
      padding: 0.85rem 1rem;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid var(--border, #e5e5e5);
    }
    .item-name {
      display: block;
      font-size: 1.15rem;
      color: var(--primary, #1d4ed8);
      margin-bottom: 0.45rem;
    }
    .meta {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.85rem;
      color: #525252;
    }
    .stock-ok { color: #15803d; font-weight: 600; }
    code {
      background: #e2e8f0;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
      font-size: 0.85rem;
      color: var(--text-secondary, #525252);
    }
    input, select, textarea {
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--border, #d4d4d4);
      border-radius: 8px;
      font: inherit;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 0.5rem;
    }
    .btn-primary, .btn-ghost {
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: var(--primary, #1d4ed8);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      background: var(--surface, #fff);
      border: 1px solid var(--border, #d4d4d4);
      color: var(--text-primary, #171717);
    }
    .error { color: #b91c1c; font-size: 0.85rem; margin: 0.5rem 0 0; }
  `,
})
export class AddStockDialog {
  private readonly api = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly variant = input<InventoryVariant | null>(null);
  /** Todas las variantes del ítem (para elegir/crear talla+género). */
  readonly variants = input<InventoryVariant[]>([]);
  readonly completed = output<void>();
  readonly dismissed = output<void>();

  readonly reasons = ENTRY_REASONS;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selection = signal<{ genero: string; talla: string }>({ genero: '', talla: '' });

  readonly form = this.fb.group({
    genero: ['', Validators.required],
    talla: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
    reasonPreset: ['', Validators.required],
    notes: [''],
  });

  readonly tallaOptions = computed(() => {
    const v = this.variant();
    const name = v?.item?.name ?? '';
    const cat = v?.item?.category?.name ?? '';
    const fromConfig = [
      ...getTallasDisponibles(name),
      ...getTallasDisponibles(cat),
    ];
    const fromVariants = this.variants().map(variantTalla).filter(Boolean);
    return [...new Set([...fromConfig, ...fromVariants])];
  });

  readonly displayStock = computed(() => {
    const { genero, talla } = this.selection();
    if (genero && talla) {
      const matched = this.variants().find(
        (x) => variantTalla(x) === talla && variantGenero(x) === genero,
      );
      if (matched) return matched.stockOwn ?? matched.stockCurrent ?? 0;
    }
    return this.variant()?.stockOwn ?? this.variant()?.stockCurrent ?? 0;
  });

  constructor() {
    this.form.valueChanges.subscribe((value) => {
      this.selection.set({
        genero: String(value.genero ?? ''),
        talla: String(value.talla ?? '').trim(),
      });
    });

    effect(() => {
      if (!this.open()) return;
      const v = this.variant();
      const genero = v ? variantGenero(v) : '';
      const talla = v ? variantTalla(v) : '';
      this.form.reset({
        genero: genero || '',
        talla: talla || '',
        quantity: 1,
        reasonPreset: '',
        notes: '',
      });
      this.selection.set({ genero: genero || '', talla: talla || '' });
      this.error.set(null);
      this.saving.set(false);
    });
  }

  submit(): void {
    const seed = this.variant();
    if (!seed || this.form.invalid) return;

    const quantity = Number(this.form.value.quantity);
    const preset = this.form.value.reasonPreset?.trim() || '';
    const notes = this.form.value.notes?.trim() || '';
    const genero = (this.form.value.genero || '') as 'M' | 'F' | '';
    const talla = String(this.form.value.talla ?? '').trim();

    if (!genero || !talla) {
      this.error.set('Selecciona género y talla.');
      return;
    }
    if (!preset) {
      this.error.set('Selecciona el motivo de entrada.');
      return;
    }

    const itemId = seed.itemId || seed.item?.id;
    const code = seed.item?.code;
    if (!itemId || !code) {
      this.error.set('No se pudo identificar el elemento.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const existing =
      this.variants().find(
        (x) => variantTalla(x) === talla && variantGenero(x) === genero,
      ) ?? null;

    const move = (variantId: string) =>
      this.api.registerMovement({
        variantId,
        movementType: 'IN',
        quantity,
        entryReason: preset,
        observations: notes || undefined,
      });

    const ensureVariant$ = existing
      ? of(existing)
      : this.api.createVariant({
          itemId,
          sku: `${code}-${genero}-${talla}`.slice(0, 80),
          attributes: {
            talla,
            genero: genero === 'F' ? 'Mujer' : 'Hombre',
          },
          talla,
          genero,
        });

    ensureVariant$
      .pipe(switchMap((variant) => move(variant.id)))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.completed.emit();
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'No se pudo registrar el ingreso.');
          this.saving.set(false);
        },
      });
  }
}
