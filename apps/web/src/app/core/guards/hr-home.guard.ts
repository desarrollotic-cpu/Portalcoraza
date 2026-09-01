import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** `/rrhh` home: panel si hay hr_dashboard.view; si no, primera pantalla que sí pueda ver. */
export const hrHomeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.hasPermission('hr_dashboard.view')) return true;
  if (auth.hasPermission('associates.view')) {
    return router.createUrlTree(['/rrhh/asociados']);
  }
  if (auth.hasPermission('absences.view')) {
    return router.createUrlTree(['/rrhh/ausentismo']);
  }
  if (auth.hasPermission('hr_alerts.view')) {
    return router.createUrlTree(['/rrhh/alertas']);
  }
  if (auth.hasPermission('retirements.view')) {
    return router.createUrlTree(['/rrhh/retiros']);
  }
  if (auth.hasPermission('job_positions.view')) {
    return router.createUrlTree(['/rrhh/admin/cargos']);
  }
  if (auth.hasPermission('work_centers.view')) {
    return router.createUrlTree(['/rrhh/admin/centros']);
  }
  if (auth.hasPermission('catalogs.view')) {
    return router.createUrlTree(['/rrhh/admin/catalogos']);
  }
  if (auth.hasPermission('hr_audit.view')) {
    return router.createUrlTree(['/rrhh/bitacora']);
  }

  return router.createUrlTree(['/sin-acceso']);
};
