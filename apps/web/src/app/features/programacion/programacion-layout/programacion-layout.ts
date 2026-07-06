import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-programacion-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Programación"
      subtitle="Cuadro mensual de asignación de personal por puesto."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class ProgramacionLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Cuadro mensual',
      route: '/programacion',
      permission: 'scheduling.view',
    },
  ];
}
