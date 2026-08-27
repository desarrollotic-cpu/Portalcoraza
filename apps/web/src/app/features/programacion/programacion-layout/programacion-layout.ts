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
      label: 'Panel & Disponibilidad',
      route: '/programacion/panel',
      permission: 'scheduling.view',
      icon: LucideLayoutDashboard,
    },
    {
      label: 'Cuadro de Turnos',
      route: '/programacion/cuadro',
      permission: 'scheduling.view',
      icon: LucideCalendarClock,
    },
    {
      label: '⚠️ Control de Alertas',
      route: '/programacion/alertas',
      permission: 'scheduling.view',
      icon: LucideAlertTriangle,
    },
    {
      label: '💰 Liquidación y Recargos (Excel)',
      route: '/programacion/recargos',
      permission: 'scheduling.view',
      icon: LucideCalculator,
    },
  ];
}

