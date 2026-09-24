import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SST_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

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
  readonly nav = SST_NAV;
}
