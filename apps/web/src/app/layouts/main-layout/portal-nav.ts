import { Type } from '@angular/core';
import {
  LucideActivity,
  LucideAlertTriangle,
  LucideBell,
  LucideBookMarked,
  LucideBoxes,
  LucideBriefcase,
  LucideBriefcaseBusiness,
  LucideBuilding2,
  LucideCalculator,
  LucideCalendarClock,
  LucideCalendarOff,
  LucideClipboardCheck,
  LucideClipboardList,
  LucideClipboardPen,
  LucideDoorOpen,
  LucideFileSpreadsheet,
  LucideFileText,
  LucideHistory,
  LucideHome,
  LucideLayoutDashboard,
  LucideLayoutGrid,
  LucideListChecks,
  LucideMapPin,
  LucidePackageSearch,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
  LucideUserCog,
  LucideUserMinus,
  LucideUsers,
  LucideUsersRound,
} from '@lucide/angular';
import {
  ModuleNavItem,
  visibleModuleNav,
} from '../../shared/components/module-shell/module-shell';

export interface PortalNavItem {
  label: string;
  route: string;
  icon: Type<unknown>;
  permission?: string;
  permissions?: string[];
  match?: 'subset' | 'exact';
  externalUrl?: string;
  children?: ModuleNavItem[];
}

export interface PortalNavGroup {
  label: string;
  items: PortalNavItem[];
}

export { visibleModuleNav };

export const OPERACIONES_NAV: ModuleNavItem[] = [
  { label: 'Panel', route: '/operaciones', permission: 'operations.view', icon: LucideBriefcaseBusiness, exact: true },
  { label: 'Puestos de trabajo', route: '/operaciones/puestos', permission: 'operations.view', icon: LucideMapPin, exact: true },
  { label: 'Fichas de puestos', route: '/operaciones/puestos/fichas', permissions: ['operations.view', 'posts.view'], icon: LucideFileText },
  { label: 'Minutas', route: '/operaciones/minutas', permission: 'operations.view', icon: LucideClipboardList, exact: true },
];

export const RRHH_NAV: ModuleNavItem[] = [
  { label: 'Panel', route: '/rrhh', permission: 'hr_dashboard.view', icon: LucideLayoutDashboard, exact: true },
  { label: 'Personal', route: '/rrhh/asociados', permission: 'associates.view', icon: LucideUsersRound },
  { label: 'Matriz SST', route: '/rrhh/matriz', permission: 'hr_compliance.view', icon: LucideShieldCheck },
  { label: 'Alertas', route: '/rrhh/alertas', permission: 'hr_alerts.view', icon: LucideBell },
  { label: 'Retiros', route: '/rrhh/retiros', permission: 'retirements.view', icon: LucideUserMinus },
  { label: 'Ausentismo', route: '/rrhh/ausentismo', permission: 'absences.view', icon: LucideCalendarOff },
  { label: 'Cargos', route: '/rrhh/admin/cargos', permission: 'job_positions.view', icon: LucideBriefcase },
  { label: 'Puestos / centros', route: '/rrhh/admin/centros', permission: 'work_centers.view', icon: LucideBuilding2 },
  { label: 'Catálogos', route: '/rrhh/admin/catalogos', permission: 'catalogs.view', icon: LucideBookMarked },
  { label: 'Importar', route: '/rrhh/importar', permission: 'hr_import.execute', icon: LucideFileSpreadsheet },
  { label: 'Bitácora', route: '/rrhh/bitacora', permission: 'hr_audit.view', icon: LucideHistory },
];

export const DOTACION_NAV: ModuleNavItem[] = [
  { label: 'Panel principal', route: '/dotacion/panel', permission: 'inventory.view', exact: true, icon: LucideLayoutDashboard },
  { label: 'Asociados', route: '/dotacion/asociados', permission: 'inventory.view', exact: true, icon: LucideUsers },
  { label: 'Inventario', route: '/dotacion/inventario', permission: 'inventory.view', icon: LucideBoxes },
  { label: 'Elementos', route: '/dotacion/elementos', permission: 'post_equipment.view', icon: LucidePackageSearch },
  { label: 'Historial', route: '/dotacion/movimientos', permission: 'inventory.view', exact: true, icon: LucideHistory },
  { label: 'Sin dotación 7+ meses', route: '/dotacion/sin-dotacion', permission: 'inventory.view', exact: true, icon: LucideBoxes },
];

export const PROGRAMACION_NAV: ModuleNavItem[] = [
  { label: 'Panel & Disponibilidad', route: '/programacion/panel', permission: 'scheduling.view', icon: LucideLayoutDashboard },
  { label: 'Personal', route: '/rrhh/asociados', permission: 'associates.view', icon: LucideUsersRound },
  { label: 'Cuadro de Turnos', route: '/programacion/cuadro', permission: 'scheduling.view', icon: LucideCalendarClock },
  { label: 'Control de Alertas', route: '/programacion/alertas', permission: 'scheduling.edit', icon: LucideAlertTriangle },
  { label: 'Liquidación y Recargos', route: '/programacion/recargos', permission: 'scheduling.edit', icon: LucideCalculator },
];

export const DOCUMENTAL_NAV: ModuleNavItem[] = [
  { label: 'Panel', route: '/documental', exact: true, permission: 'documental.view', icon: LucideLayoutGrid },
  { label: 'Correspondencia', route: '/documental/correspondencia', permission: 'documental.view', icon: LucideFileText },
  { label: 'Minutas', route: '/documental/minutas', permission: 'documental.view', icon: LucideClipboardList },
  { label: 'Asociados Retirados', route: '/documental/asociados', permission: 'documental.view', icon: LucideUsersRound },
  { label: 'Contratos', route: '/documental/contratos', permission: 'documental.view', icon: LucideShieldCheck },
  { label: 'Préstamos', route: '/documental/prestamos', permissions: ['documental.view', 'documental.loans'], icon: LucideCalendarClock },
  { label: 'Biblioteca', route: '/documental/biblioteca', permission: 'documental.view', icon: LucideBoxes },
  { label: 'VOXELSERA', route: '/documental/voxelsera', permission: 'documental.view', icon: LucideBoxes },
  { label: 'Buscador Universal', route: '/documental/buscador', permission: 'documental.view', icon: LucideSearch },
  { label: 'Informes', route: '/documental/informes', permission: 'documental.view', icon: LucideClipboardList },
];

export const RECEPCION_NAV: ModuleNavItem[] = [
  { label: 'Panel de control', route: '/recepcion/panel', permission: 'reception.view', exact: true, icon: LucideLayoutDashboard },
  { label: 'Personal', route: '/rrhh/asociados', permission: 'associates.view', icon: LucideUsersRound },
  { label: 'Informe de puestos', route: '/recepcion/puestos', permission: 'reception.view', exact: true, icon: LucideBriefcaseBusiness },
  { label: 'Fichas de puestos', route: '/recepcion/puestos/fichas', permissions: ['reception.view', 'posts.view'], icon: LucideFileText },
  { label: 'Gestionar puestos', route: '/recepcion/puestos/gestionar', permission: 'posts.create', exact: true, icon: LucideBriefcaseBusiness },
  { label: 'Registrar visitante', route: '/recepcion/registrar', permission: 'reception.register', exact: true, icon: LucideClipboardPen },
  { label: 'Visitantes dentro', route: '/recepcion/dentro', permission: 'reception.view', exact: true, icon: LucideUsersRound },
  { label: 'Historial de visitas', route: '/recepcion/historial', permission: 'reception.view', exact: true, icon: LucideHistory },
];

export const SST_NAV: ModuleNavItem[] = [
  { label: 'Panel', route: '/sst/panel', permission: 'sst.view', exact: true, icon: LucideLayoutDashboard },
  { label: 'Nueva inspección', route: '/sst/inspecciones/nueva', permission: 'sst.inspect', exact: true, icon: LucideClipboardList },
  { label: 'Planes de acción', route: '/sst/planes', permission: 'sst.view', exact: true, icon: LucideListChecks },
  { label: 'Checklist IPT (34)', route: '/sst/checklist', permission: 'sst.view', exact: true, icon: LucideClipboardCheck },
  { label: 'Clientes y puestos', route: '/sst/puestos', permission: 'sst.manage', exact: true, icon: LucideMapPin },
];

export const ADMIN_NAV: ModuleNavItem[] = [
  { label: 'Panel', route: '/admin', permission: 'users.view', exact: true, icon: LucideLayoutDashboard },
  { label: 'Usuarios', route: '/admin/usuarios', permission: 'users.view', exact: true, icon: LucideUserCog },
  { label: 'Roles y permisos', route: '/admin/roles', permission: 'roles.view', exact: true, icon: LucideShieldCheck },
  { label: 'Historial de movimientos', route: '/historial-movimientos', permission: 'audit.view', exact: true, icon: LucideClipboardList },
];

export const PORTAL_NAV_GROUPS: PortalNavGroup[] = [
  {
    label: 'General',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: LucideHome, match: 'exact', permissions: ['users.view', 'dashboard.view'] },
      { label: 'Historial de movimientos', route: '/historial-movimientos', icon: LucideClipboardList, match: 'exact', permission: 'audit.view' },
      { label: 'Control de Actividades', route: '/control-actividades', icon: LucideActivity, match: 'exact', permission: 'activity_control.view' },
    ],
  },
  {
    label: 'Operación',
    items: [
      { label: 'Operaciones', route: '/operaciones', icon: LucideBriefcaseBusiness, permission: 'operations.view', children: OPERACIONES_NAV },
      { label: 'Recursos Humanos', route: '/rrhh', icon: LucideUsersRound, permissions: ['associates.view', 'hr_dashboard.view'], children: RRHH_NAV },
      { label: 'Dotación', route: '/dotacion', icon: LucideBoxes, permission: 'inventory.view', children: DOTACION_NAV },
      { label: 'Programación', route: '/programacion', icon: LucideCalendarClock, permission: 'scheduling.view', children: PROGRAMACION_NAV },
      { label: 'Nómina', route: '/nomina', icon: LucideBriefcaseBusiness, permission: 'payroll.view' },
      { label: 'Documental', route: '/documental', icon: LucideClipboardList, permissions: ['documental.view', 'documental.loans'], children: DOCUMENTAL_NAV },
      { label: 'Recepción', route: '/recepcion', icon: LucideDoorOpen, permission: 'reception.view', children: RECEPCION_NAV },
      { label: 'SST / Salud y Seguridad', route: '/sst', icon: LucideShieldCheck, permission: 'sst.view', children: SST_NAV },
      { label: 'SIG-Indicadores', route: '/sig', icon: LucideSparkles, permission: 'sig.view' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Administración', route: '/admin', icon: LucideUserCog, permission: 'users.view', children: ADMIN_NAV },
    ],
  },
];
