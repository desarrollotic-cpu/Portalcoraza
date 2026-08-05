import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBoxes,
  LucideCalendarClock,
  LucideClipboardList,
  LucideFileText,
  LucideLayoutGrid,
  LucideSearch,
  LucideShieldCheck,
  LucideUsersRound,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-documental-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Gestión Documental"
      subtitle="SGD Coraza — correspondencia, minutas, contratos, préstamos y archivo físico."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class DocumentalLayout {
  readonly nav: ModuleNavItem[] = [
    { label: 'Panel', route: '/documental', exact: true, permission: 'documental.view', icon: LucideLayoutGrid },
    { label: 'Correspondencia', route: '/documental/correspondencia', permission: 'documental.view', icon: LucideFileText },
    { label: 'Minutas', route: '/documental/minutas', permission: 'documental.view', icon: LucideClipboardList },
    { label: 'Asociados Retirados', route: '/documental/asociados', permission: 'documental.view', icon: LucideUsersRound },
    { label: 'Contratos', route: '/documental/contratos', permission: 'documental.view', icon: LucideShieldCheck },
    { label: 'Préstamos', route: '/documental/prestamos', permission: 'documental.view', icon: LucideCalendarClock },
    { label: 'Biblioteca', route: '/documental/biblioteca', permission: 'documental.view', icon: LucideBoxes },
    { label: 'VOXELSERA', route: '/documental/voxelsera', permission: 'documental.view', icon: LucideBoxes },
    { label: 'Workflows', route: '/documental/workflows', permission: 'documental.view', icon: LucideBell },
    { label: 'TRD', route: '/documental/trd', permission: 'documental.view', icon: LucideFileText },
    // Herramientas (como en SGD Coraza)
    { label: 'Buscador Universal', route: '/documental/buscador', permission: 'documental.view', icon: LucideSearch },
    { label: 'Informes', route: '/documental/informes', permission: 'documental.view', icon: LucideClipboardList },
  ];
}
