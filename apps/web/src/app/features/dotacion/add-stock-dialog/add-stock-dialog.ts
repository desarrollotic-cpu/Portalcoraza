import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
            <span class="stock-ok">Stock actual: {{ v.stockCurrent }} unidades</span>
            @if ((v.item?.lowStockThreshold ?? 0) > 0) {
              <span>Stock mínimo: {{ v.item?.lowStockThreshold }} unidades</span>
            }
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()">
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
  readonly completed = output<void>();
  readonly dismissed = output<void>();

  readonly reasons = ENTRY_REASONS;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
    reasonPreset: ['', Validators.required],
    notes: [''],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.reset({ quantity: 1, reasonPreset: '', notes: '' });
        this.error.set(null);
        this.saving.set(false);
      }
    });
  }

  submit(): void {
    const v = this.variant();
    if (!v || this.form.invalid) return;

    const quantity = Number(this.form.value.quantity);
    const preset = this.form.value.reasonPreset?.trim() || '';
    const notes = this.form.value.notes?.trim() || '';
    if (!preset) {
      this.error.set('Selecciona el motivo de entrada.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.api
      .registerMovement({
        variantId: v.id,
        movementType: 'IN',
        quantity,
        entryReason: preset,
        observations: notes || undefined,
      })
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
