import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  template: `
    @if (open()) {
      <div class="backdrop" (click)="onBackdropClick()">
        <div class="panel" role="dialog" (click)="$event.stopPropagation()">
          <header class="panel-header">
            <h3>{{ title() }}</h3>
            <button type="button" class="close" (click)="closed.emit()" aria-label="Cerrar">×</button>
          </header>
          <div class="panel-body">
            <ng-content />
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
      background: var(--coraza-surface);
      border-radius: var(--coraza-radius);
      border: 1px solid var(--coraza-border);
      box-shadow: var(--coraza-shadow);
      width: min(720px, 100%);
      max-height: 90vh;
      overflow: auto;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--coraza-border);
    }
    .panel-header h3 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--primary-dark);
    }
    .close {
      border: none;
      background: transparent;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: var(--coraza-text-muted);
    }
    .panel-body { padding: 1.25rem; }
  `,
})
export class ModalShell {
  readonly open = input(false);
  readonly title = input('Diálogo');
  readonly closeOnBackdrop = input(true);
  readonly closed = output<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }
}
