import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideClipboardList,
  LucideLayoutDashboard,
  LucideListChecks,
  LucideMapPin,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-sst-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="SST / Salud y Seguridad"
      subtitle="IPT, seguimiento de puestos, hallazgos y planes de acción."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class SstLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Panel',
      route: '/sst/panel',
      permission: 'sst.view',
      exact: true,
      icon: LucideLayoutDashboard,
    },
    {
      label: 'Nueva inspección',
      route: '/sst/inspecciones/nueva',
      permission: 'sst.inspect',
      exact: true,
      icon: LucideClipboardList,
    },
    {
      label: 'Planes de acción',
      route: '/sst/planes',
      permission: 'sst.view',
      exact: true,
      icon: LucideListChecks,
    },
    {
      label: 'Clientes y puestos',
      route: '/sst/puestos',
      permission: 'sst.manage',
      exact: true,
      icon: LucideMapPin,
    },
  ];
}
