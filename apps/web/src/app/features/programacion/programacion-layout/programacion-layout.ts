import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  LucideCalendarClock,
  LucideLayoutDashboard,
  LucideLayoutGrid,
  LucideAlertTriangle,
  LucideCalculator,
} from '@lucide/angular';
import { ModuleNavItem, ModuleShell } from '../../../shared/components/module-shell/module-shell';

@Component({
  selector: 'app-programacion-layout',
  imports: [RouterOutlet, ModuleShell],
  template: `
    <app-module-shell
      title="Programación"
      subtitle="Cuadro mensual de asignación de personal por puesto y liquidación de recargos."
      [nav]="nav"
    >
      <router-outlet />
    </app-module-shell>
  `,
})
export class ProgramacionLayout {
  readonly nav: ModuleNavItem[] = [
    {
      label: 'Panel',
      route: '/programacion',
      permission: 'scheduling.view',
      icon: LucideLayoutDashboard,
      exact: true,
    },
    {
      label: 'Matriz multi-puesto',
      route: '/programacion/matriz',
      permission: 'scheduling.view',
      icon: LucideLayoutGrid,
    },
    {
      label: 'Cuadro mensual',
      route: '/programacion/cuadro',
      permission: 'scheduling.view',
      icon: LucideCalendarClock,
    },
    {
      label: 'Liquidación de recargos',
      route: '/programacion/recargos',
      permission: 'scheduling.view',
      icon: LucideCalculator,
    },
    {
      label: 'Alertas',
      route: '/programacion/alertas',
      permission: 'scheduling.view',
      icon: LucideAlertTriangle,
    },
  ];
}

