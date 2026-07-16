import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideBoxes,
  LucideHistory,
  LucideLayoutDashboard,
  LucidePackageSearch,
  LucideUsers,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-dotacion-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Dotación"
      subtitle="Inventario, entregas y elementos entregados a puestos."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class DotacionLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Panel principal',
      route: '/dotacion/panel',
      permission: 'inventory.view',
      exact: true,
      icon: LucideLayoutDashboard,
    },
    {
      label: 'Asociados',
      route: '/dotacion/asociados',
      permission: 'inventory.view',
      exact: true,
      icon: LucideUsers,
    },
    {
      label: 'Inventario',
      route: '/dotacion/inventario',
      permission: 'inventory.view',
      icon: LucideBoxes,
    },
    {
      label: 'Elementos',
      route: '/dotacion/elementos',
      permission: 'post_equipment.view',
      icon: LucidePackageSearch,
    },
    {
      label: 'Historial',
      route: '/dotacion/movimientos',
      permission: 'inventory.view',
      exact: true,
      icon: LucideHistory,
    },
    {
      label: 'Sin dotación 7+ meses',
      route: '/dotacion/sin-dotacion',
      permission: 'inventory.view',
      exact: true,
      icon: LucideBoxes,
    },
  ];
}
