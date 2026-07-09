import { Component, inject } from '@angular/core';
import {
  LucideAlertTriangle,
  LucideCircleCheck,
  LucideCircleX,
  LucideInfo,
  LucideX,
} from '@lucide/angular';
import { ToastService } from '../../services/toast.service';
import { Icon } from '../icon/icon';

/**
 * Región global de notificaciones. Se monta una vez en `MainLayout` para que
 * escuche el `ToastService`. Los mensajes se agrupan en la esquina inferior
 * derecha y se autodescartan según su TTL.
 */
@Component({
  selector: 'app-toaster',
  imports: [Icon],
  template: `
    <div class="toaster" aria-live="polite">
      @for (m of toast.messages(); track m.id) {
        <div class="toast" [attr.data-kind]="m.kind" role="status">
          <span class="icon" [attr.data-kind]="m.kind">
            <app-icon [icon]="iconFor(m.kind)" [size]="18" />
          </span>
          <div class="body">
            <strong>{{ m.title }}</strong>
            @if (m.body) { <span>{{ m.body }}</span> }
          </div>
          <button type="button" class="dismiss" (click)="toast.dismiss(m.id)" aria-label="Cerrar">
            <app-icon [icon]="icons.X" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toaster {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
      pointer-events: none;
    }
    .toast {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.85rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 4px solid var(--primary-500);
      border-radius: 12px;
      box-shadow: var(--shadow-xl);
      pointer-events: auto;
      animation: slide-in 0.22s ease-out;
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .toast[data-kind='success'] { border-left-color: #16a34a; }
    .toast[data-kind='error'] { border-left-color: #dc2626; }
    .toast[data-kind='warning'] { border-left-color: #f59e0b; }
    .toast[data-kind='info'] { border-left-color: var(--primary-500); }

    .icon {
      width: 28px; height: 28px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--primary-50); color: var(--primary-700);
    }
    .icon[data-kind='success'] { background: #dcfce7; color: #166534; }
    .icon[data-kind='error'] { background: #fee2e2; color: #991b1b; }
    .icon[data-kind='warning'] { background: #fef3c7; color: #92400e; }

    .body { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.85rem; }
    .body strong { color: var(--text-primary); font-weight: 600; }
    .body span { color: var(--text-secondary); }

    .dismiss {
      background: transparent; border: none; cursor: pointer;
      color: var(--text-muted);
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border-radius: 6px;
    }
    .dismiss:hover { background: var(--surface-2); color: var(--text-primary); }
  `,
})
export class Toaster {
  readonly toast = inject(ToastService);

  readonly icons = {
    Success: LucideCircleCheck,
    Error: LucideCircleX,
    Warning: LucideAlertTriangle,
    Info: LucideInfo,
    X: LucideX,
  };

  iconFor(kind: string) {
    switch (kind) {
      case 'success':
        return this.icons.Success;
      case 'error':
        return this.icons.Error;
      case 'warning':
        return this.icons.Warning;
      default:
        return this.icons.Info;
    }
  }
}
