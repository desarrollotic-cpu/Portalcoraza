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
          import('./features/dotacion/delivery-form/delivery-form').then((m) => m.DeliveryForm),
      },
      {
        path: 'dotacion/entregas/:id/firmar',
        canActivate: [permissionGuard],
        data: { permission: 'deliveries.sign' },
        loadComponent: () =>
          import('./features/dotacion/delivery-form/delivery-form').then((m) => m.DeliveryForm),
      },
      {
        path: 'programacion',
        canActivate: [permissionGuard],
        data: { permission: 'scheduling.view' },
        loadComponent: () =>
          import('./features/programacion/schedule-matrix/schedule-matrix').then(
            (m) => m.ScheduleMatrix,
          ),
      },
      {
        path: 'programacion/calendario',
        canActivate: [permissionGuard],
        data: { permission: 'scheduling.view' },
        loadComponent: () =>
          import('./features/programacion/schedule-calendar/schedule-calendar').then(
            (m) => m.ScheduleCalendar,
          ),
      },
      {
        path: 'programacion/turno/nuevo',
        canActivate: [permissionGuard],
        data: { permission: 'scheduling.create' },
        loadComponent: () =>
          import('./features/programacion/shift-form/shift-form').then((m) => m.ShiftForm),
      },
      {
        path: 'programacion/turno/:id/editar',
        canActivate: [permissionGuard],
        data: { permission: 'scheduling.edit' },
        loadComponent: () =>
          import('./features/programacion/shift-form/shift-form').then((m) => m.ShiftForm),
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
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
