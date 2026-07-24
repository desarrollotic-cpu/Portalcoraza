import { Routes } from '@angular/router';
import { EXTERNAL_APPS } from './core/config/external-apps';
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
        // Fase 1: Portal = puerta de entrada → Gestión Humana oficial (datos en Render).
        // El código interno /rrhh se conserva en el repo para fases posteriores / SSO.
        path: 'rrhh',
        canActivate: [permissionGuard],
        data: {
          permissions: [
            'hr_dashboard.view',
            'associates.view',
            'hr_alerts.view',
            'retirements.view',
            'absences.view',
            'job_positions.view',
            'work_centers.view',
            'catalogs.view',
            'hr_import.execute',
            'hr_audit.view',
          ],
          permissionMode: 'any',
          externalUrl: EXTERNAL_APPS.gestionHumana,
          externalLabel: 'Gestión Humana',
        },
        loadComponent: () =>
          import('./features/portal-bridge/external-app-redirect').then(
            (m) => m.ExternalAppRedirect,
          ),
      },
      {
        path: 'dotacion',
        canActivate: [permissionGuard],
        data: { permission: 'inventory.view' },
        loadComponent: () =>
          import('./features/dotacion/dotacion-layout/dotacion-layout').then((m) => m.DotacionLayout),
        children: [
          { path: '', redirectTo: 'panel', pathMatch: 'full' },
          {
            path: 'panel',
            loadComponent: () =>
              import('./features/dotacion/dotacion-panel/dotacion-panel').then((m) => m.DotacionPanel),
          },
          {
            path: 'asociados',
            loadComponent: () =>
              import('./features/dotacion/dotacion-asociados/dotacion-asociados').then(
                (m) => m.DotacionAsociados,
              ),
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
            path: 'elementos',
            canActivate: [permissionGuard],
            data: { permission: 'post_equipment.view' },
            loadComponent: () =>
              import('./features/dotacion/post-equipment-catalog/post-equipment-catalog').then(
                (m) => m.PostEquipmentCatalog,
              ),
          },
          {
            path: 'elementos/puestos',
            canActivate: [permissionGuard],
            data: { permission: 'post_equipment.view' },
            loadComponent: () =>
              import('./features/dotacion/post-equipment-list/post-equipment-list').then(
                (m) => m.PostEquipmentList,
              ),
          },
          {
            path: 'elementos/puestos/:postId',
            canActivate: [permissionGuard],
            data: { permission: 'post_equipment.view' },
            loadComponent: () =>
              import('./features/dotacion/post-equipment-detail/post-equipment-detail').then(
                (m) => m.PostEquipmentDetail,
              ),
          },
          {
            path: 'elementos/:id',
            canActivate: [permissionGuard],
            data: { permission: 'post_equipment.view' },
            loadComponent: () =>
              import(
                './features/dotacion/post-equipment-catalog-detail/post-equipment-catalog-detail'
              ).then((m) => m.PostEquipmentCatalogDetailPage),
          },
          {
            path: 'puestos',
            redirectTo: 'elementos/puestos',
            pathMatch: 'full',
          },
          {
            path: 'puestos/:postId',
            redirectTo: 'elementos/puestos/:postId',
          },
          {
            path: 'entregas',
            redirectTo: 'asociados',
            pathMatch: 'full',
          },
          {
            path: 'entregas/nueva',
            redirectTo: 'asociados',
            pathMatch: 'full',
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
        // Fase 1: Portal → Programación oficial (GitHub Pages).
        path: 'programacion',
        canActivate: [permissionGuard],
        data: {
          permission: 'scheduling.view',
          externalUrl: EXTERNAL_APPS.programacion,
          externalLabel: 'Programación',
        },
        loadComponent: () =>
          import('./features/portal-bridge/external-app-redirect').then(
            (m) => m.ExternalAppRedirect,
          ),
      },
      {
        // Fase 1: Portal → Documental oficial (Google Apps Script).
        path: 'documental',
        canActivate: [permissionGuard],
        data: {
          permission: 'documental.view',
          externalUrl: EXTERNAL_APPS.documental,
          externalLabel: 'Gestión Documental',
          externalHint:
            'Usa Google (SGD CORAZA). Puede pedir cuenta Google la primera vez y tardar unos segundos en cargar.',
        },
        loadComponent: () =>
          import('./features/portal-bridge/external-app-redirect').then(
            (m) => m.ExternalAppRedirect,
          ),
      },
      {
        path: 'recepcion',
        canActivate: [permissionGuard],
        data: { permission: 'reception.view' },
        loadComponent: () =>
          import('./features/reception/reception-layout/reception-layout').then(
            (m) => m.ReceptionLayout,
          ),
        children: [
          { path: '', redirectTo: 'panel', pathMatch: 'full' },
          {
            path: 'panel',
            canActivate: [permissionGuard],
            data: { permission: 'reception.view' },
            loadComponent: () =>
              import('./features/reception/reception-panel/reception-panel').then(
                (m) => m.ReceptionPanel,
              ),
          },
          {
            path: 'registrar',
            canActivate: [permissionGuard],
            data: { permission: 'reception.register' },
            loadComponent: () =>
              import('./features/reception/reception-register/reception-register').then(
                (m) => m.ReceptionRegister,
              ),
          },
          {
            path: 'dentro',
            canActivate: [permissionGuard],
            data: { permission: 'reception.view' },
            loadComponent: () =>
              import('./features/reception/reception-inside/reception-inside').then(
                (m) => m.ReceptionInside,
              ),
          },
          {
            path: 'historial',
            canActivate: [permissionGuard],
            data: { permission: 'reception.view' },
            loadComponent: () =>
              import('./features/reception/reception-history/reception-history').then(
                (m) => m.ReceptionHistory,
              ),
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
