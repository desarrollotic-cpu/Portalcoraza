import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideHistory, LucideHome, LucidePlusCircle } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import {
  ModuleNavItem,
  ModuleShell,
  visibleModuleNav,
} from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-minuta-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModuleShell],
  template: `
    <app-module-shell
      title="Minuta Virtual"
      subtitle="Bitácora del puesto. Indica quién registra; la hora la pone el sistema."
      [nav]="nav"
    >
      <nav class="minuta-links" aria-label="Minuta">
        @for (item of visibleNav(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            {{ item.label }}
          </a>
        }
      </nav>
      <router-outlet />
    </app-module-shell>
  `,
  styles: `
    .minuta-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }
    .minuta-links a {
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.82rem;
    }
    .minuta-links a.active {
      background: var(--primary-50);
      color: var(--primary-700);
      border-color: var(--primary-200);
    }
  `,
})
export class MinutaLayout {
  private readonly auth = inject(AuthService);
  readonly visibleNav = computed(() =>
    visibleModuleNav(this.nav, (code) => this.auth.hasPermission(code)),
  );
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Inicio',
      route: '/minutas',
      permission: 'minuta.view',
      icon: LucideHome,
      exact: true,
    },
    {
      label: 'Nuevo',
      route: '/minutas/nuevo',
      permission: 'minuta.create',
      icon: LucidePlusCircle,
      exact: true,
    },
    {
      label: 'Historial',
      route: '/minutas/historial',
      permission: 'minuta.view',
      icon: LucideHistory,
      exact: true,
    },
  ];
}
