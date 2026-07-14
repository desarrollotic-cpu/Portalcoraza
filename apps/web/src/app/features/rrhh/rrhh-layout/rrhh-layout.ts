import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideBookMarked,
  LucideBriefcase,
  LucideBuilding2,
  LucideCalendarOff,
  LucideFileSpreadsheet,
  LucideHistory,
  LucideLayoutDashboard,
  LucideShieldCheck,
  LucideUserMinus,
  LucideUsersRound,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

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
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Panel',
      route: '/rrhh',
      permission: 'hr_dashboard.view',
      icon: LucideLayoutDashboard,
      exact: true,
    },
    {
      label: 'Asociados',
      route: '/rrhh/asociados',
      permission: 'associates.view',
      icon: LucideUsersRound,
    },
    {
      label: 'Matriz SST',
      route: '/rrhh/matriz',
      permission: 'hr_dashboard.view',
      icon: LucideShieldCheck,
    },
    {
      label: 'Alertas',
      route: '/rrhh/alertas',
      permission: 'hr_alerts.view',
      icon: LucideBell,
    },
    {
      label: 'Retiros',
      route: '/rrhh/retiros',
      permission: 'retirements.view',
      icon: LucideUserMinus,
    },
    {
      label: 'Ausentismo',
      route: '/rrhh/ausentismo',
      permission: 'absences.view',
      icon: LucideCalendarOff,
    },
    {
      label: 'Cargos',
      route: '/rrhh/admin/cargos',
      permission: 'job_positions.view',
      icon: LucideBriefcase,
    },
    {
      label: 'Centros',
      route: '/rrhh/admin/centros',
      permission: 'work_centers.view',
      icon: LucideBuilding2,
    },
    {
      label: 'Catálogos',
      route: '/rrhh/admin/catalogos',
      permission: 'catalogs.view',
      icon: LucideBookMarked,
    },
    {
      label: 'Importar',
      route: '/rrhh/importar',
      permission: 'hr_import.execute',
      icon: LucideFileSpreadsheet,
    },
    {
      label: 'Bitácora',
      route: '/rrhh/bitacora',
      permission: 'hr_audit.view',
      icon: LucideHistory,
    },
  ];
}
