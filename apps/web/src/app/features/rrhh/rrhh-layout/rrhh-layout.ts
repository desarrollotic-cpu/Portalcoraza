import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideUsersRound } from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-rrhh-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Recursos Humanos"
      subtitle="Fuente única del personal: gestión de asociados, novedades y cumplimiento."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class RrhhLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Asociados',
      route: '/rrhh/asociados',
      permission: 'associates.view',
      icon: LucideUsersRound,
    },
  ];
}
