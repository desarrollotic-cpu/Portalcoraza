import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideFileText } from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-documental-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Documental"
      subtitle="Gestión y revisión de documentos institucionales."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class DocumentalLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Documentos',
      route: '/documental',
      permission: 'documental.view',
      icon: LucideFileText,
    },
  ];
}
