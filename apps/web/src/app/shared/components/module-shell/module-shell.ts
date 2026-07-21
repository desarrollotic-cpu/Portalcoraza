import { Component, Type, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideGrid2X2, LucideX } from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../icon/icon';

export interface ModuleNavItem {
  label: string;
  route: string;
  permission?: string;
  exact?: boolean;
  icon?: Type<unknown>;
  description?: string;
}

@Component({
  selector: 'app-module-shell',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <section class="module-shell">
      <header class="module-top">
        @if (visibleNav().length > 0) {
          <div class="launcher-wrap">
            <button
              type="button"
              class="launcher-btn"
              [class.open]="launcherOpen()"
              (click)="toggleLauncher($event)"
              [attr.aria-expanded]="launcherOpen()"
              aria-label="Ver pantallas del módulo"
              title="Pantallas del módulo"
            >
              <app-icon
                [icon]="launcherOpen() ? icons.X : icons.Grid"
                [size]="20"
                [strokeWidth]="2"
              />
            </button>

            @if (launcherOpen()) {
              <div class="launcher-panel" role="menu" (click)="$event.stopPropagation()">
                <div class="launcher-panel-header">
                  <div>
                    <strong>Pantallas</strong>
                    <span class="module-name">{{ title() }}</span>
                  </div>
                  <button
                    type="button"
                    class="close-btn"
                    (click)="closeLauncher()"
                    aria-label="Cerrar"
                  >
                    <app-icon [icon]="icons.X" [size]="16" [strokeWidth]="2" />
                  </button>
                </div>
                <div class="launcher-grid">
                  @for (item of visibleNav(); track item.route) {
                    <a
                      class="launcher-item"
                      role="menuitem"
                      [routerLink]="item.route"
                      routerLinkActive="active"
                      [routerLinkActiveOptions]="
                        item.exact
                          ? { exact: true }
                          : {
                              paths: 'subset',
                              queryParams: 'ignored',
                              fragment: 'ignored',
                              matrixParams: 'ignored',
                            }
                      "
                      (click)="closeLauncher()"
                    >
                      <span class="launcher-icon">
                        @if (item.icon) {
                          <app-icon [icon]="item.icon" [size]="20" [strokeWidth]="1.9" />
                        } @else {
                          <span class="launcher-initials">{{ initialsFor(item.label) }}</span>
                        }
                      </span>
                      <span class="launcher-label">{{ item.label }}</span>
                    </a>
                  }
                </div>
              </div>
            }
          </div>
        }

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

    .launcher-wrap {
      position: relative;
      flex-shrink: 0;
      padding-top: 0.1rem;
    }
    .launcher-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      color: var(--primary-600);
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
    }
    .launcher-btn:hover {
      background: var(--primary-50);
      border-color: var(--primary-200);
      transform: translateY(-1px);
    }
    .launcher-btn.open {
      background: var(--gradient-primary);
      color: #fff;
      border-color: transparent;
      box-shadow: var(--shadow-primary);
    }

    .launcher-panel {
      position: absolute;
      top: calc(100% + 0.65rem);
      left: 0;
      z-index: 40;
      width: min(420px, calc(100vw - 3rem));
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border, var(--border));
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      padding: 1rem;
      animation: launcher-in 0.18s ease-out;
    }
    @keyframes launcher-in {
      from {
        opacity: 0;
        transform: translateY(-4px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .launcher-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0.25rem 0.35rem 0.85rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 0.85rem;
    }
    .launcher-panel-header strong {
      display: block;
      font-family: var(--font-display);
      font-size: 0.95rem;
      color: var(--text-primary);
    }
    .module-name {
      font-size: 0.72rem;
      color: var(--text-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .close-btn:hover {
      background: var(--neutral-100);
      color: var(--text-primary);
    }

    .launcher-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .launcher-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.55rem;
      padding: 0.9rem 0.5rem;
      border-radius: var(--radius);
      text-decoration: none;
      color: var(--text-primary);
      border: 1px solid transparent;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
    }
    .launcher-item:hover {
      background: var(--surface-2);
      border-color: var(--border);
      transform: translateY(-2px);
    }
    .launcher-item.active {
      background: var(--primary-50);
      border-color: var(--primary-200);
    }
    .launcher-item.active .launcher-icon {
      background: var(--gradient-primary);
      color: #fff;
      box-shadow: var(--shadow-primary);
    }
    .launcher-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--surface-2);
      color: var(--primary-600);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        box-shadow 0.15s ease;
    }
    .launcher-item:hover .launcher-icon {
      background: var(--primary-50);
      color: var(--primary-700);
    }
    .launcher-initials {
      font-size: 0.85rem;
      font-weight: 700;
    }
    .launcher-label {
      font-size: 0.75rem;
      text-align: center;
      line-height: 1.25;
      color: var(--text-secondary);
      max-width: 100%;
      word-break: break-word;
    }
    .launcher-item.active .launcher-label {
      color: var(--primary-700);
      font-weight: 600;
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
      box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6);
      animation: pulse 1.8s ease-out infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.6);
      }
      70% {
        box-shadow: 0 0 0 8px rgba(99, 102, 241, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
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
  `,
  host: {
    '(document:click)': 'closeLauncher()',
  },
})
export class ModuleShell {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly nav = input<ModuleNavItem[]>([]);

  readonly icons = { Grid: LucideGrid2X2, X: LucideX };
  readonly launcherOpen = signal(false);

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
    this.nav().filter((item) => !item.permission || this.auth.hasPermission(item.permission)),
  );

  readonly activeScreen = computed(() => {
    const url = this.currentUrl();
    const items = this.visibleNav();
    const match = [...items]
      .sort((a, b) => b.route.length - a.route.length)
      .find((item) => url === item.route || url.startsWith(`${item.route}/`));
    return match?.label ?? null;
  });

  toggleLauncher(event: MouseEvent): void {
    event.stopPropagation();
    this.launcherOpen.update((open) => !open);
  }

  closeLauncher(): void {
    if (this.launcherOpen()) {
      this.launcherOpen.set(false);
    }
  }

  initialsFor(label: string): string {
    const words = label.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return label.slice(0, 2).toUpperCase();
  }
}
