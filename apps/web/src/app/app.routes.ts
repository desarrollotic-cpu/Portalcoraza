import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth',
    component: AuthLayout,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
    ],
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'rrhh/asociados',
        canActivate: [permissionGuard],
        data: { permission: 'associates.view' },
        loadComponent: () =>
          import('./features/rrhh/associates-list/associates-list').then((m) => m.AssociatesList),
      },
      {
        path: 'rrhh/asociados/nuevo',
        canActivate: [permissionGuard],
        data: { permission: 'associates.create' },
        loadComponent: () =>
          import('./features/rrhh/associate-form/associate-form').then((m) => m.AssociateForm),
      },
      {
        path: 'rrhh/asociados/:id/editar',
        canActivate: [permissionGuard],
        data: { permission: 'associates.edit' },
        loadComponent: () =>
          import('./features/rrhh/associate-form/associate-form').then((m) => m.AssociateForm),
      },
      {
        path: 'rrhh/asociados/:id',
        canActivate: [permissionGuard],
        data: { permission: 'associates.view' },
        loadComponent: () =>
          import('./features/rrhh/associate-detail/associate-detail').then((m) => m.AssociateDetail),
      },
      {
        path: 'dotacion',
        canActivate: [permissionGuard],
        data: { permission: 'inventory.view' },
        loadComponent: () =>
          import('./features/dotacion/inventory-list/inventory-list').then((m) => m.InventoryList),
      },
      {
        path: 'dotacion/inventario/nuevo',
        canActivate: [permissionGuard],
        data: { permission: 'inventory.create' },
        loadComponent: () =>
          import('./features/dotacion/inventory-form/inventory-form').then((m) => m.InventoryForm),
      },
      {
        path: 'dotacion/inventario/:id/editar',
        canActivate: [permissionGuard],
        data: { permission: 'inventory.edit' },
        loadComponent: () =>
          import('./features/dotacion/inventory-form/inventory-form').then((m) => m.InventoryForm),
      },
      {
        path: 'dotacion/entregas',
        canActivate: [permissionGuard],
        data: { permission: 'deliveries.view' },
        loadComponent: () =>
          import('./features/dotacion/deliveries-list/deliveries-list').then((m) => m.DeliveriesList),
      },
      {
        path: 'dotacion/entregas/nueva',
        canActivate: [permissionGuard],
        data: { permission: 'deliveries.create' },
        loadComponent: () =>
          import('./features/dotacion/delivery-new/delivery-new').then((m) => m.DeliveryNew),
      },
      {
        path: 'dotacion/entregas/:id/firmar',
        canActivate: [permissionGuard],
        data: { permission: 'deliveries.sign' },
        loadComponent: () =>
          import('./features/dotacion/delivery-sign/delivery-sign').then((m) => m.DeliverySign),
      },
      {
        path: 'programacion',
        canActivate: [permissionGuard],
        data: { permission: 'scheduling.view' },
        loadComponent: () =>
          import('./features/programacion/schedule-board/schedule-board').then(
            (m) => m.ScheduleBoard,
          ),
      },
      {
        path: 'documental',
        canActivate: [permissionGuard],
        data: { permission: 'documental.view' },
        loadComponent: () =>
          import('./features/documental/documents-list/documents-list').then(
            (m) => m.DocumentsList,
          ),
      },
      {
        path: 'documental/nuevo',
        canActivate: [permissionGuard],
        data: { permission: 'documental.create' },
        loadComponent: () =>
          import('./features/documental/document-form/document-form').then((m) => m.DocumentForm),
      },
      {
        path: 'documental/:id/editar',
        canActivate: [permissionGuard],
        data: { permission: 'documental.create' },
        loadComponent: () =>
          import('./features/documental/document-form/document-form').then((m) => m.DocumentForm),
      },
      {
        path: 'residential',
        canActivate: [permissionGuard],
        data: { permission: 'residential.view' },
        loadComponent: () =>
          import('./features/residential/units-list/units-list').then((m) => m.UnitsList),
      },
      {
        path: 'residential/visitantes',
        canActivate: [permissionGuard],
        data: { permission: 'residential.visitors' },
        loadComponent: () =>
          import('./features/residential/visitors-log/visitors-log').then((m) => m.VisitorsLog),
      },
      {
        path: 'residential/paquetes',
        canActivate: [permissionGuard],
        data: { permission: 'residential.packages' },
        loadComponent: () =>
          import('./features/residential/packages/packages').then((m) => m.Packages),
      },
      {
        path: 'residential/reservas',
        canActivate: [permissionGuard],
        data: { permission: 'residential.reservations' },
        loadComponent: () =>
          import('./features/residential/reservations/reservations').then((m) => m.Reservations),
      },
      {
        path: 'admin/usuarios',
        canActivate: [permissionGuard],
        data: { permission: 'users.view' },
        loadComponent: () =>
          import('./features/admin/users-list/users-list').then((m) => m.UsersList),
      },
      {
        path: 'admin/roles',
        canActivate: [permissionGuard],
        data: { permission: 'roles.view' },
        loadComponent: () =>
          import('./features/admin/roles-permissions/roles-permissions').then(
            (m) => m.RolesPermissions,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
