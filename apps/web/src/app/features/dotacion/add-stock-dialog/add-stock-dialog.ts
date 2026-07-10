import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InventoryApiService, InventoryVariant } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';

@Component({
  selector: 'app-add-stock-dialog',
  imports: [ModalShell, ReactiveFormsModule],
  template: `
    <app-modal-shell
      [open]="open()"
      [title]="'Agregar stock'"
      (closed)="dismissed.emit()"
    >
      @if (variant(); as v) {
        <p class="variant-info">
          <strong>{{ v.item?.name ?? v.sku }}</strong>
          <span class="muted">{{ v.sku }} · Stock actual: {{ v.stockCurrent }}</span>
          @if (attrsLabel(v)) {
            <span class="muted">{{ attrsLabel(v) }}</span>
          }
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Cantidad a ingresar
            <input formControlName="quantity" type="number" min="1" max="9999" inputmode="numeric" />
          </label>
          <label>
            Motivo (opcional)
            <textarea formControlName="reason" rows="2" placeholder="Ej. Compra, devolución, ajuste de inventario"></textarea>
          </label>

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }

          <div class="actions">
            <button type="button" class="btn-ghost" (click)="dismissed.emit()">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="saving() || form.invalid">
              {{ saving() ? 'Guardando...' : 'Registrar ingreso' }}
            </button>
          </div>
        </form>
      }
    </app-modal-shell>
  `,
  styles: `
    .variant-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin: 0 0 1rem;
      padding: 0.75rem 1rem;
      background: var(--surface-2);
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .muted { color: var(--text-muted); font-size: 0.85rem; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
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
      background: var(--gradient-primary);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-primary);
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

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
    reason: [''],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.reset({ quantity: 1, reason: '' });
        this.error.set(null);
        this.saving.set(false);
      }
    });
  }

  attrsLabel(v: InventoryVariant): string {
    const entries = Object.entries(v.attributes ?? {});
    if (!entries.length) return '';
    return entries.map(([k, val]) => `${k}: ${String(val)}`).join(', ');
  }

  submit(): void {
    const v = this.variant();
    if (!v || this.form.invalid) return;

    const quantity = Number(this.form.value.quantity);
    const reason = this.form.value.reason?.trim() || undefined;

    this.saving.set(true);
    this.error.set(null);

    this.api
      .registerMovement({
        variantId: v.id,
        movementType: 'IN',
        quantity,
        reason,
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
