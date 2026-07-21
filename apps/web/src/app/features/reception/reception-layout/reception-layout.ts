import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideClipboardPen,
  LucideHistory,
  LucideLayoutDashboard,
  LucideUsersRound,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-reception-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Recepción"
      subtitle="Panel de visitantes e ingresos a la sede. El historial queda guardado en la nube."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class ReceptionLayout {
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
