import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredPermission = route.data?.['permission'] as string | undefined;

  if (!requiredPermission) {
    return true;
  }

  if (auth.hasPermission(requiredPermission)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
