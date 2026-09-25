import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { Icon } from '../icon/icon';

/**
 * Atrás predecible (ui-ux-pro-max / Navigation + Back Behavior):
 * 1) historial interno del portal (preserva filtros/estado)
 * 2) fallback explícito o padre lógico de la URL
 *
 * Touch: área ≥44px; aria-label siempre presente.
 */
@Component({
  selector: 'app-back-nav',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="back-nav"
      (click)="goBack()"
      [attr.aria-label]="label()"
      [title]="label()"
    >
      <app-icon [icon]="icon" [size]="18" [strokeWidth]="2" />
      <span>{{ label() }}</span>
    </button>
  `,
  styles: `
    .back-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 44px;
      min-width: 44px;
      margin: 0;
      padding: 0.45rem 0.85rem 0.45rem 0.65rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      line-height: 1.2;
      transition:
        color 160ms ease,
        border-color 160ms ease,
        background 160ms ease;
    }
    .back-nav:hover {
      color: var(--primary-700);
      border-color: var(--primary-200);
      background: var(--primary-50);
    }
    .back-nav:active {
      transform: scale(0.98);
    }
    .back-nav:focus-visible {
      outline: 2px solid var(--primary-500);
      outline-offset: 2px;
    }
  `,
})
export class BackNav {
  readonly label = input('Atrás');
  /** Ruta si no hay historial interno (p. ej. enlace directo / deep link). */
  readonly fallback = input<string | undefined>(undefined);

  readonly icon = LucideArrowLeft;

  private readonly location = inject(Location);
  private readonly router = inject(Router);

  goBack(): void {
    const prev = this.router.lastSuccessfulNavigation()?.previousNavigation;
    if (prev) {
      this.location.back();
      return;
    }
    const explicit = this.fallback();
    if (explicit) {
      void this.router.navigateByUrl(explicit);
      return;
    }
    const parts = this.router.url.split('?')[0].split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      void this.router.navigateByUrl('/' + parts.join('/'));
      return;
    }
    void this.router.navigateByUrl('/dashboard');
  }
}
