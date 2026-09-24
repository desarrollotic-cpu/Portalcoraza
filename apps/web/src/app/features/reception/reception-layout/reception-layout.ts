import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RECEPCION_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

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
  readonly nav = RECEPCION_NAV;
}
