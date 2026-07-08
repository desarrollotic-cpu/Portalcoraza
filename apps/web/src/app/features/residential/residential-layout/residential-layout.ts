import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideBuilding2,
  LucideCalendarCheck,
  LucidePackageOpen,
  LucideUsersRound,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-residential-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Residencial"
      subtitle="Unidades, visitantes, paquetería y reservas del puesto asignado."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class ResidentialLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Unidades',
      route: '/residential/unidades',
      permission: 'residential.view',
      exact: true,
      icon: LucideBuilding2,
    },
    {
      label: 'Visitantes',
      route: '/residential/visitantes',
      permission: 'residential.visitors',
      exact: true,
      icon: LucideUsersRound,
    },
    {
      label: 'Paquetes',
      route: '/residential/paquetes',
      permission: 'residential.packages',
      exact: true,
      icon: LucidePackageOpen,
    },
    {
      label: 'Reservas',
      route: '/residential/reservas',
      permission: 'residential.reservations',
      exact: true,
      icon: LucideCalendarCheck,
    },
  ];
}
