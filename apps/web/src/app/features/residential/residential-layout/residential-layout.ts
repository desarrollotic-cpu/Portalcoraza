import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-residential-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Residencial"
      subtitle="Unidades, visitantes, paquetes y reservas del puesto asignado."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class ResidentialLayout {
  readonly nav: ModuleNavItem[] = [
    { label: 'Unidades', route: '/residential/unidades', permission: 'residential.view', exact: true },
    {
      label: 'Visitantes',
      route: '/residential/visitantes',
      permission: 'residential.visitors',
      exact: true,
    },
    { label: 'Paquetes', route: '/residential/paquetes', permission: 'residential.packages', exact: true },
    {
      label: 'Reservas',
      route: '/residential/reservas',
      permission: 'residential.reservations',
      exact: true,
    },
  ];
}
