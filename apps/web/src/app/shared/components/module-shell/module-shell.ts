import { Component, Type, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

export interface ModuleNavItem {
  label: string;
  route: string;
  permission?: string;
  permissions?: string[];
  exact?: boolean;
  icon?: Type<unknown>;
  description?: string;
}

export function visibleModuleNav(
  items: ModuleNavItem[],
  hasPermission: (code: string) => boolean,
): ModuleNavItem[] {
  return items.filter((item) => {
    if (item.permissions?.length) {
      return item.permissions.some((code) => hasPermission(code));
    }
    return !item.permission || hasPermission(item.permission);
  });
}

@Component({
  selector: 'app-module-shell',
  imports: [],
  template: `
    <section class="module-shell">
      <header class="module-top">
        <div class="module-brand">
          <div class="module-titles">
            <h1>{{ title() }}</h1>
            @if (activeScreen()) {
              <span class="active-screen">
                <span class="pulse"></span>
                {{ activeScreen() }}
              </span>
            }
          </div>
          @if (subtitle()) {
            <p>{{ subtitle() }}</p>
          }
        </div>

        <div class="module-actions">
          <ng-content select="[moduleActions]" />
        </div>
      </header>

      <div class="module-body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .module-shell {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .module-top {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 0 0 1.25rem;
    }
    .module-brand {
      min-width: 0;
      flex: 1;
    }
    .module-titles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem 0.85rem;
    }
    .module-brand h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    .active-screen {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--primary-700);
      background: var(--primary-50);
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      border: 1px solid var(--primary-100);
    }
    .pulse {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--primary-500);
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-600) 60%, transparent);
      animation: pulse 1.8s ease-out infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-600) 60%, transparent);
      }
      70% {
        box-shadow: 0 0 0 8px color-mix(in srgb, var(--primary-600) 0%, transparent);
      }
      100% {
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-600) 0%, transparent);
      }
    }
    .module-brand p {
      margin: 0.4rem 0 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
      max-width: 720px;
    }
    .module-actions {
      margin-left: auto;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.15rem;
    }
    .module-body {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.5rem 1.75rem;
      min-height: 320px;
      box-shadow: var(--shadow);
    }
    @media (max-width: 900px) {
      .module-top {
        flex-wrap: wrap;
        gap: 0.75rem;
        padding-bottom: 0.85rem;
      }
      .module-brand h1 {
        font-size: 1.2rem;
      }
      .module-brand p {
        font-size: 0.8rem;
        line-height: 1.35;
      }
      .module-body {
        padding: 1rem;
        min-height: 0;
        border-radius: 12px;
      }
    }
  `,
})
export class ModuleShell {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly nav = input<ModuleNavItem[]>([]);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly visibleNav = computed(() =>
    visibleModuleNav(this.nav(), (code) => this.auth.hasPermission(code)),
  );

  readonly activeScreen = computed(() => {
    const url = this.currentUrl().split('?')[0];
    const match = [...this.visibleNav()]
      .sort((a, b) => b.route.length - a.route.length)
      .find((item) => url === item.route || url.startsWith(`${item.route}/`));
    return match?.label ?? null;
  });
}
