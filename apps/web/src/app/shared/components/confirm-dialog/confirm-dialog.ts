import { Component, input, output } from '@angular/core';

/**
 * Diálogo de confirmación con el look del portal (reemplazo de window.confirm).
 */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (open()) {
      <div class="backdrop" (click)="onBackdrop()">
        <div class="panel" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <header class="panel-header">
            <h3>{{ title() }}</h3>
            <button type="button" class="close" (click)="cancelled.emit()" aria-label="Cerrar">×</button>
          </header>
          <div class="panel-body">
            <p class="message">{{ message() }}</p>
            @if (detail()) {
              <p class="detail">{{ detail() }}</p>
            }
            <div class="actions">
              <button type="button" class="btn-ghost" [disabled]="busy()" (click)="cancelled.emit()">
                {{ cancelLabel() }}
              </button>
              <button
                type="button"
                class="btn-confirm"
                [class.danger]="danger()"
                [disabled]="busy()"
                (click)="confirmed.emit()"
              >
                {{ busy() ? busyLabel() : confirmLabel() }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .panel {
      background: var(--coraza-surface, #fff);
      border-radius: var(--coraza-radius, 12px);
      border: 1px solid var(--coraza-border, #e2e8f0);
      box-shadow: var(--coraza-shadow, 0 18px 40px rgba(15, 23, 42, 0.18));
      width: min(440px, 100%);
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.15rem;
      border-bottom: 1px solid var(--coraza-border, #e2e8f0);
    }
    .panel-header h3 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--primary-dark, #1e3a5f);
    }
    .close {
      border: none;
      background: transparent;
      font-size: 1.45rem;
      line-height: 1;
      cursor: pointer;
      color: var(--coraza-text-muted, #64748b);
    }
    .panel-body {
      padding: 1.15rem 1.2rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .message {
      margin: 0;
      color: var(--coraza-text, #0f172a);
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .detail {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary, #64748b);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      margin-top: 0.35rem;
      flex-wrap: wrap;
    }
    .btn-ghost,
    .btn-confirm {
      border-radius: 999px;
      padding: 0.5rem 1rem;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-ghost {
      border: 1px solid var(--coraza-border, #e2e8f0);
      background: transparent;
      color: var(--primary-dark, #1e3a5f);
    }
    .btn-confirm {
      border: 1px solid color-mix(in srgb, var(--primary, #1d4ed8) 40%, transparent);
      background: var(--primary, #1d4ed8);
      color: #fff;
    }
    .btn-confirm.danger {
      border-color: color-mix(in srgb, #dc2626 40%, transparent);
      background: #dc2626;
    }
    .btn-ghost:disabled,
    .btn-confirm:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input('Confirmar');
  readonly message = input('');
  readonly detail = input<string | null>(null);
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly busyLabel = input('Procesando…');
  readonly busy = input(false);
  readonly danger = input(false);
  readonly closeOnBackdrop = input(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onBackdrop(): void {
    if (this.closeOnBackdrop() && !this.busy()) {
      this.cancelled.emit();
    }
  }
}
