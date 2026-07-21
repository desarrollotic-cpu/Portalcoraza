import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideClipboardPen,
  LucideHistory,
  LucideLayoutDashboard,
  LucideMoon,
  LucideSun,
  LucideUsersRound,
} from '@lucide/angular';
import { ThemeService } from '../../../core/services/theme.service';
import { Icon } from '../../../shared/components/icon/icon';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-reception-layout',
  imports: [RouterOutlet, ModuleShell, Icon],
  host: {
    '[attr.data-theme]': 'theme.mode()',
    class: 'reception-theme',
  },
  template: `
    <app-module-shell
      title="Recepción"
      subtitle="Panel de visitantes e ingresos a la sede. El historial queda guardado en la nube."
      [nav]="nav"
    >
      <button
        moduleActions
        type="button"
        class="theme-toggle"
        (click)="theme.toggle()"
        [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
        [title]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'"
      >
        <app-icon
          [icon]="theme.isDark() ? icons.Sun : icons.Moon"
          [size]="18"
          [strokeWidth]="2"
        />
        <span>{{ theme.isDark() ? 'Claro' : 'Oscuro' }}</span>
      </button>
      <router-outlet />
    </app-module-shell>
  `,
  styles: `
    :host {
      display: block;
    }
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 0.85rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text-secondary);
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--shadow-sm);
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease;
    }
    .theme-toggle:hover {
      background: var(--surface-2);
      color: var(--text-primary);
      border-color: var(--border-strong);
    }
  `,
})
export class ReceptionLayout {
  readonly theme = inject(ThemeService);
  readonly icons = { Moon: LucideMoon, Sun: LucideSun };

  readonly nav: ModuleNavItem[] = [
    {
      label: 'Panel de control',
      route: '/recepcion/panel',
      permission: 'reception.view',
      exact: true,
      icon: LucideLayoutDashboard,
    },
    {
      label: 'Registrar visitante',
      route: '/recepcion/registrar',
      permission: 'reception.register',
      exact: true,
      icon: LucideClipboardPen,
    },
    {
      label: 'Visitantes dentro',
      route: '/recepcion/dentro',
      permission: 'reception.view',
      exact: true,
      icon: LucideUsersRound,
    },
    {
      label: 'Historial de visitas',
      route: '/recepcion/historial',
      permission: 'reception.view',
      exact: true,
      icon: LucideHistory,
    },
  ];
}
