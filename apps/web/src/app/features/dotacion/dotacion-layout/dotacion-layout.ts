import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-dotacion-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Dotación"
      subtitle="Inventario, entregas y control de dotación del personal."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class DotacionLayout {
  readonly nav: ModuleNavItem[] = [
    { label: 'Panel principal', route: '/dotacion/panel', permission: 'inventory.view', exact: true },
    { label: 'Inventario', route: '/dotacion/inventario', permission: 'inventory.view' },
    { label: 'Entregas', route: '/dotacion/entregas', permission: 'deliveries.view' },
    { label: 'Movimientos', route: '/dotacion/movimientos', permission: 'inventory.view', exact: true },
  ];
}
