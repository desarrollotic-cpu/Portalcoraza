import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface ModuleNavItem {
  label: string;
  route: string;
  permission?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-module-shell',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <section class="module-shell">
      <header class="module-top">
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </header>

      @if (visibleNav().length > 0) {
        <nav class="module-tabs" [attr.aria-label]="title()">
          @for (item of visibleNav(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="
                item.exact ? { exact: true } : { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }
              "
            >
              {{ item.label }}
            </a>
          }
        </nav>
      }

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
      margin: -0.5rem -0.25rem 0;
    }
    .module-top {
      padding: 0 0 0.75rem;
    }
    .module-top h1 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--primary-dark);
    }
    .module-top p {
      margin: 0.3rem 0 0;
      font-size: 0.9rem;
      color: var(--coraza-text-muted);
    }
    .module-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: var(--coraza-radius) var(--coraza-radius) 0 0;
      padding: 0 0.5rem;
      box-shadow: var(--coraza-shadow);
    }
    .module-tabs a {
      position: relative;
      display: inline-flex;
      align-items: center;
      padding: 0.85rem 1.15rem;
      text-decoration: none;
      color: var(--coraza-text-muted);
      font-size: 0.9rem;
      font-weight: 500;
      white-space: nowrap;
      border-bottom: 3px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    .module-tabs a:hover {
      color: var(--primary-dark);
    }
    .module-tabs a.active {
      color: var(--primary-dark);
      border-bottom-color: var(--primary);
      font-weight: 600;
    }
    .module-body {
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-top: none;
      border-radius: 0 0 var(--coraza-radius) var(--coraza-radius);
      padding: 1.25rem 1.5rem;
      min-height: 280px;
      box-shadow: var(--coraza-shadow);
    }
  `,
})
export class ModuleShell {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly nav = input<ModuleNavItem[]>([]);

  private readonly auth = inject(AuthService);

  readonly visibleNav = computed(() =>
    this.nav().filter((item) => !item.permission || this.auth.hasPermission(item.permission)),
  );
}
