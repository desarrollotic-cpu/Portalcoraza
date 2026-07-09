import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredPermissions = route.data?.['permissions'] as string[] | undefined;
  const permissionMode = (route.data?.['permissionMode'] as 'any' | 'all') ?? 'any';
  const requiredPermission = route.data?.['permission'] as string | undefined;

  if (requiredPermissions?.length) {
    const allowed =
      permissionMode === 'all'
        ? requiredPermissions.every((p) => auth.hasPermission(p))
        : requiredPermissions.some((p) => auth.hasPermission(p));
    if (allowed) return true;
    return router.createUrlTree(['/dashboard']);
  }

  if (!requiredPermission) {
    return true;
  }

  if (auth.hasPermission(requiredPermission)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
