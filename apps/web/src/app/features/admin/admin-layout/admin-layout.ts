import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Administración"
      subtitle="Usuarios, roles y permisos del sistema."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class AdminLayout {
  readonly nav: ModuleNavItem[] = [
    { label: 'Usuarios', route: '/admin/usuarios', permission: 'users.view', exact: true },
    { label: 'Roles y permisos', route: '/admin/roles', permission: 'roles.view', exact: true },
  ];
}
