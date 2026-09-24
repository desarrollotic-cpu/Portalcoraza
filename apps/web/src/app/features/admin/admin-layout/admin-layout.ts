import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ADMIN_NAV } from '../../../layouts/main-layout/portal-nav';
import { ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Administración"
      subtitle="Usuarios, roles, permisos e historial de movimientos del portal."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class AdminLayout {
  readonly nav = ADMIN_NAV;
}
