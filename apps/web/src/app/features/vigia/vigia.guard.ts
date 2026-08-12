import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { VigiaAuthService } from './vigia-auth.service';

export const vigiaGuard: CanActivateFn = () => {
  const auth = inject(VigiaAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/vigia/login']);
};
