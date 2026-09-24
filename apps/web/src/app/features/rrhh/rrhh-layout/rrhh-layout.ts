import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RRHH_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-rrhh-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Gestión Humana"
      subtitle="Fuente única del personal: hoja de vida digital, cumplimiento SST y bitácora."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class RrhhLayout {
  readonly nav = RRHH_NAV;
}
