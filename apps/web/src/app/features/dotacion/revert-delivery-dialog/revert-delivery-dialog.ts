import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalShell } from '../modal-shell/modal-shell';

@Component({
  selector: 'app-revert-delivery-dialog',
  imports: [ModalShell, ReactiveFormsModule],
  template: `
    <app-modal-shell [open]="open()" title="Revertir entrega" (closed)="cancel()">
      <p>La entrega volverá al inventario. El motivo es obligatorio (mín. 10 caracteres).</p>
      <form [formGroup]="form" (ngSubmit)="confirm()">
        <label>
          Motivo
          <textarea formControlName="reason" rows="4" placeholder="Describa el motivo de la reversión..."></textarea>
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="actions">
          <button type="button" (click)="cancel()">Cancelar</button>
          <button type="submit" [disabled]="form.invalid || saving()">Revertir entrega</button>
        </div>
      </form>
    </app-modal-shell>
  `,
  styles: `
    label { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
    textarea {
      padding: 0.5rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      resize: vertical;
    }
    .actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  `,
})
export class RevertDeliveryDialog {
  readonly open = input(false);
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<string>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(10)]],
  });

  confirm(): void {
    if (this.form.invalid) return;
    this.confirmed.emit(this.form.controls.reason.value.trim());
  }

  cancel(): void {
    this.form.reset({ reason: '' });
    this.cancelled.emit();
  }
}
