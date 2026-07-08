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
        path: 'rrhh',
        canActivate: [permissionGuard],
        data: { permission: 'associates.view' },
        loadComponent: () =>
          import('./features/rrhh/rrhh-layout/rrhh-layout').then((m) => m.RrhhLayout),
        children: [
          { path: '', redirectTo: 'asociados', pathMatch: 'full' },
          {
            path: 'asociados',
            loadComponent: () =>
              import('./features/rrhh/associates-list/associates-list').then(
                (m) => m.AssociatesList,
              ),
          },
          {
            path: 'asociados/nuevo',
            canActivate: [permissionGuard],
            data: { permission: 'associates.create' },
            loadComponent: () =>
              import('./features/rrhh/associate-form/associate-form').then((m) => m.AssociateForm),
          },
          {
            path: 'asociados/:id/editar',
            canActivate: [permissionGuard],
            data: { permission: 'associates.edit' },
            loadComponent: () =>
              import('./features/rrhh/associate-form/associate-form').then((m) => m.AssociateForm),
          },
          {
            path: 'asociados/:id',
            loadComponent: () =>
              import('./features/rrhh/associate-detail/associate-detail').then(
                (m) => m.AssociateDetail,
              ),
          },
        ],
      },
      {
        path: 'dotacion',
        canActivate: [permissionGuard],
        data: { permission: 'inventory.view' },
        loadComponent: () =>
          import('./features/dotacion/dotacion-layout/dotacion-layout').then((m) => m.DotacionLayout),
        children: [
          { path: '', redirectTo: 'inventario', pathMatch: 'full' },
          {
            path: 'panel',
            loadComponent: () =>
              import('./features/dotacion/dotacion-panel/dotacion-panel').then((m) => m.DotacionPanel),
          },
          {
            path: 'inventario',
            loadComponent: () =>
              import('./features/dotacion/inventory-list/inventory-list').then((m) => m.InventoryList),
          },
          {
            path: 'inventario/nuevo',
            canActivate: [permissionGuard],
            data: { permission: 'inventory.create' },
            loadComponent: () =>
              import('./features/dotacion/inventory-form/inventory-form').then((m) => m.InventoryForm),
          },
          {
            path: 'inventario/:id/editar',
            canActivate: [permissionGuard],
            data: { permission: 'inventory.edit' },
            loadComponent: () =>
              import('./features/dotacion/inventory-form/inventory-form').then((m) => m.InventoryForm),
          },
          {
            path: 'entregas',
            canActivate: [permissionGuard],
            data: { permission: 'deliveries.view' },
            loadComponent: () =>
              import('./features/dotacion/deliveries-list/deliveries-list').then(
                (m) => m.DeliveriesList,
              ),
          },
          {
            path: 'entregas/nueva',
            canActivate: [permissionGuard],
            data: { permission: 'deliveries.create' },
            loadComponent: () =>
              import('./features/dotacion/delivery-new/delivery-new').then((m) => m.DeliveryNew),
          },
          {
            path: 'entregas/:id/firmar',
            canActivate: [permissionGuard],
            data: { permission: 'deliveries.sign' },
            loadComponent: () =>
              import('./features/dotacion/delivery-sign/delivery-sign').then((m) => m.DeliverySign),
          },
          {
            path: 'movimientos',
            loadComponent: () =>
              import('./features/dotacion/dotacion-movimientos/dotacion-movimientos').then(
                (m) => m.DotacionMovimientos,
              ),
          },
          {
            path: 'sin-dotacion',
            loadComponent: () =>
              import('./features/dotacion/dotacion-sin-dotacion/dotacion-sin-dotacion').then(
                (m) => m.DotacionSinDotacion,
              ),
          },
        ],
      },
      {
        path: 'programacion',
        canActivate: [permissionGuard],
        data: { permission: 'scheduling.view' },
        loadComponent: () =>
          import('./features/programacion/programacion-layout/programacion-layout').then(
            (m) => m.ProgramacionLayout,
          ),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/programacion/schedule-board/schedule-board').then(
                (m) => m.ScheduleBoard,
              ),
          },
        ],
      },
      {
        path: 'documental',
        canActivate: [permissionGuard],
        data: { permission: 'documental.view' },
        loadComponent: () =>
          import('./features/documental/documental-layout/documental-layout').then(
            (m) => m.DocumentalLayout,
          ),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/documental/documents-list/documents-list').then(
                (m) => m.DocumentsList,
              ),
          },
          {
            path: 'nuevo',
            canActivate: [permissionGuard],
            data: { permission: 'documental.create' },
            loadComponent: () =>
              import('./features/documental/document-form/document-form').then((m) => m.DocumentForm),
          },
          {
            path: ':id/editar',
            canActivate: [permissionGuard],
            data: { permission: 'documental.create' },
            loadComponent: () =>
              import('./features/documental/document-form/document-form').then((m) => m.DocumentForm),
          },
        ],
      },
      {
        path: 'residential',
        canActivate: [permissionGuard],
        data: { permission: 'residential.view' },
        loadComponent: () =>
          import('./features/residential/residential-layout/residential-layout').then(
            (m) => m.ResidentialLayout,
          ),
        children: [
          { path: '', redirectTo: 'unidades', pathMatch: 'full' },
          {
            path: 'unidades',
            loadComponent: () =>
              import('./features/residential/units-list/units-list').then((m) => m.UnitsList),
          },
          {
            path: 'visitantes',
            canActivate: [permissionGuard],
            data: { permission: 'residential.visitors' },
            loadComponent: () =>
              import('./features/residential/visitors-log/visitors-log').then((m) => m.VisitorsLog),
          },
          {
            path: 'paquetes',
            canActivate: [permissionGuard],
            data: { permission: 'residential.packages' },
            loadComponent: () =>
              import('./features/residential/packages/packages').then((m) => m.Packages),
          },
          {
            path: 'reservas',
            canActivate: [permissionGuard],
            data: { permission: 'residential.reservations' },
            loadComponent: () =>
              import('./features/residential/reservations/reservations').then((m) => m.Reservations),
          },
        ],
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { permission: 'users.view' },
        loadComponent: () =>
          import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
        children: [
          { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/admin/users-list/users-list').then((m) => m.UsersList),
          },
          {
            path: 'roles',
            canActivate: [permissionGuard],
            data: { permission: 'roles.view' },
            loadComponent: () =>
              import('./features/admin/roles-permissions/roles-permissions').then(
                (m) => m.RolesPermissions,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
