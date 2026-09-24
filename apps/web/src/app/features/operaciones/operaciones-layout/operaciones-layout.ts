import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OPERACIONES_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-operaciones-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Operaciones"
      subtitle="Puestos, fichas y consulta de minutas. Alta de puestos: solo Recepción."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class OperacionesLayout {
  readonly nav = OPERACIONES_NAV;
}
