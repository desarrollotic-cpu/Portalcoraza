import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-rrhh-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Recursos Humanos"
      subtitle="Gestión de personal y asociados de la cooperativa."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class RrhhLayout {
  readonly nav: ModuleNavItem[] = [
    { label: 'Asociados', route: '/rrhh/asociados', permission: 'associates.view' },
  ];
}
