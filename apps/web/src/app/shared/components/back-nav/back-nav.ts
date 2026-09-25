import { Location } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideArrowLeft } from '@lucide/angular';
import { Icon } from '../icon/icon';

/**
 * Atrás predecible (ui-ux-pro-max):
 * - Navigation/Back: historial primero, luego fallback
 * - Accessibility: contraste texto ≥4.5:1 (fondo primary + blanco)
 * - Touch: área ≥44px; aria-label; foco visible
 * - Affordance: CTA sólido (no ghost) para no perderse en el topbar
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
      <app-icon [icon]="icon" [size]="18" [strokeWidth]="2.4" />
      <span>{{ label() }}</span>
    </button>
  `,
  styles: `
    .back-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      flex-shrink: 0;
      min-height: 44px;
      margin: 0;
      padding: 0.5rem 1.05rem 0.5rem 0.85rem;
      border: none;
      border-radius: 10px;
      background: var(--gradient-primary);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      line-height: 1.2;
      box-shadow: var(--shadow-primary, 0 4px 14px color-mix(in srgb, #0369a1 35%, transparent));
      transition:
        filter 160ms ease,
        transform 160ms ease,
        box-shadow 160ms ease;
    }
    .back-nav:hover {
      filter: brightness(1.08);
      box-shadow: 0 6px 18px color-mix(in srgb, #0369a1 42%, transparent);
    }
    .back-nav:active {
      transform: scale(0.97);
      filter: brightness(0.96);
    }
    .back-nav:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
      box-shadow:
        0 0 0 4px var(--primary-500),
        var(--shadow-primary, 0 4px 14px color-mix(in srgb, #0369a1 35%, transparent));
    }
  `,
})
export class BackNav {
  readonly label = input('Volver');
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
