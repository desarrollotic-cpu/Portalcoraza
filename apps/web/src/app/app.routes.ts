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
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
