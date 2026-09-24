import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PROGRAMACION_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-programacion-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Programación"
      subtitle="Cuadro mensual de asignación de personal por puesto y liquidación de recargos."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class ProgramacionLayout {
  readonly nav = PROGRAMACION_NAV;
}
