import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOTACION_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-dotacion-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <div class="dotacion-touch">
      <app-module-shell
        title="Dotación"
        subtitle="Inventario, entregas y elementos entregados a puestos."
        [nav]="nav"
      >
        <router-outlet />
      </app-module-shell>
    </div>
  `,
})
export class DotacionLayout {
  readonly nav = DOTACION_NAV;
}
