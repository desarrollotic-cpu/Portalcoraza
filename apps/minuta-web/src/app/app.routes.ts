import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/minuta-shell').then((m) => m.MinutaShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/minuta/minuta-inicio/minuta-inicio').then(
            (m) => m.MinutaInicio,
          ),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./features/minuta/minuta-nuevo/minuta-nuevo').then(
            (m) => m.MinutaNuevo,
          ),
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./features/minuta/minuta-historial/minuta-historial').then(
            (m) => m.MinutaHistorial,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
