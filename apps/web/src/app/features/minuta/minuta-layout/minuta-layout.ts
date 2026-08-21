import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideHistory, LucideHome, LucidePlusCircle } from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-minuta-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Minuta Virtual"
      subtitle="Bitácora del puesto. Indica quién registra; la hora la pone el sistema."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class MinutaLayout {
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
