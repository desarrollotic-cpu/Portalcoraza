import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  if (user?.role?.code === 'PUESTO') {
    auth.discardPortalSession();
    return router.createUrlTree(['/auth/login'], { queryParams: { from: 'puesto' } });
  }

  return true;
};
