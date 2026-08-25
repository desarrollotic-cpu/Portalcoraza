import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideBriefcaseBusiness, LucideClipboardList, LucideMapPin } from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-operaciones-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Operaciones"
      subtitle="Gestión operativa de puestos de trabajo. Los puestos activos alimentan Programación."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class OperacionesLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Panel',
      route: '/operaciones',
      permission: 'posts.view',
      icon: LucideBriefcaseBusiness,
      exact: true,
    },
    {
      label: 'Puestos de trabajo',
      route: '/operaciones/puestos',
      permission: 'posts.view',
      icon: LucideMapPin,
      exact: true,
    },
    {
      label: 'Minutas',
      route: '/operaciones/minutas',
      permission: 'posts.view',
      icon: LucideClipboardList,
      exact: true,
    },
  ];
}
