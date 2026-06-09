import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const ACCESS_KEY = 'coraza_access';
const REFRESH_KEY = 'coraza_refresh';
const USER_KEY = 'coraza_user';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        auth.currentUser.set(null);
        void router.navigate(['/auth/login']);
      } else if (error.status === 403) {
        window.alert('No tienes permisos para esta accion');
      } else if (error.status >= 500) {
        window.alert('Error del servidor, intente nuevamente');
      }

      return throwError(() => error);
    }),
  );
};
