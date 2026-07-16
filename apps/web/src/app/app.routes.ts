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
        },
        loadComponent: () =>
          import('./features/rrhh/rrhh-layout/rrhh-layout').then((m) => m.RrhhLayout),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/rrhh/hr-dashboard/hr-dashboard').then((m) => m.HrDashboard),
          },
          {
            path: 'ausentismo',
            canActivate: [permissionGuard],
            data: { permission: 'absences.view' },
            loadComponent: () =>
              import('./features/rrhh/absenteeism-panel/absenteeism-panel').then(
                (m) => m.AbsenteeismPanel,
              ),
          },
          {
            path: 'asociados',
            canActivate: [permissionGuard],
            data: { permission: 'associates.view' },
            loadComponent: () =>
              import('./features/rrhh/associates-list/associates-list').then((m) => m.AssociatesList),
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
            path: 'asociados/:id/reingreso',
            canActivate: [permissionGuard],
            data: { permission: 'retirements.readmit' },
            loadComponent: () =>
              import('./features/rrhh/retirements/readmit-form/readmit-form').then((m) => m.ReadmitForm),
          },
          {
            path: 'asociados/:id',
            canActivate: [permissionGuard],
            data: { permission: 'associates.view' },
            loadComponent: () =>
              import('./features/rrhh/associate-detail/associate-detail').then((m) => m.AssociateDetail),
          },
          {
            path: 'matriz',
            canActivate: [permissionGuard],
            data: { permission: 'hr_dashboard.view' },
            loadComponent: () =>
              import('./features/rrhh/compliance-matrix/compliance-matrix').then((m) => m.ComplianceMatrix),
          },
          {
            path: 'alertas',
            canActivate: [permissionGuard],
            data: { permission: 'hr_alerts.view' },
            loadComponent: () =>
              import('./features/rrhh/alerts-panel/alerts-panel').then((m) => m.AlertsPanel),
          },
          {
            path: 'retiros',
            canActivate: [permissionGuard],
            data: { permission: 'retirements.view' },
            loadComponent: () =>
              import('./features/rrhh/retirements/retirements-list/retirements-list').then(
                (m) => m.RetirementsList,
              ),
          },
          {
            path: 'retiros/nuevo/:associateId',
            canActivate: [permissionGuard],
            data: { permission: 'retirements.create' },
            loadComponent: () =>
              import('./features/rrhh/retirements/retirement-form/retirement-form').then(
                (m) => m.RetirementForm,
              ),
          },
          {
            path: 'admin/cargos',
            canActivate: [permissionGuard],
            data: { permission: 'job_positions.view' },
            loadComponent: () =>
              import('./features/rrhh/admin/job-positions-admin/job-positions-admin').then(
                (m) => m.JobPositionsAdmin,
              ),
          },
          {
            path: 'admin/centros',
            canActivate: [permissionGuard],
            data: { permission: 'work_centers.view' },
            loadComponent: () =>
              import('./features/rrhh/admin/work-centers-admin/work-centers-admin').then(
                (m) => m.WorkCentersAdmin,
              ),
          },
          {
            path: 'admin/catalogos',
            canActivate: [permissionGuard],
            data: { permission: 'catalogs.view' },
            loadComponent: () =>
              import('./features/rrhh/admin/catalogs-admin/catalogs-admin').then((m) => m.CatalogsAdmin),
          },
          {
            path: 'importar',
            canActivate: [permissionGuard],
            data: { permission: 'hr_import.execute' },
            loadComponent: () =>
              import('./features/rrhh/excel-import/excel-import').then((m) => m.ExcelImport),
          },
          {
            path: 'bitacora',
            canActivate: [permissionGuard],
            data: { permission: 'hr_audit.view' },
            loadComponent: () =>
              import('./features/rrhh/hr-audit-log/hr-audit-log').then((m) => m.HrAuditLog),
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
