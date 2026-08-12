import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const ACCESS_KEY = 'coraza_access';
const REFRESH_KEY = 'coraza_refresh';
const USER_KEY = 'coraza_user';
const RETRY_HEADER = 'X-Auth-Retry';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const rawHttp = new HttpClient(inject(HttpBackend));

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/vigia/') &&
        !req.headers.has(RETRY_HEADER)
      ) {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) {
          clearSession(auth, router);
          return throwError(() => error);
        }

        return rawHttp
          .post<{ accessToken: string; user?: { id: string; email: string; fullName: string | null; role: { code: string; name: string }; permissions: string[] } }>(
            `${environment.apiUrl}/auth/refresh`,
            { refreshToken },
          )
          .pipe(
            switchMap((res) => {
              localStorage.setItem(ACCESS_KEY, res.accessToken);
              if (res.user) {
                localStorage.setItem(USER_KEY, JSON.stringify(res.user));
                auth.currentUser.set(res.user);
              } else {
                auth.syncPermissionsFromAccessToken();
              }
              const retry = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${res.accessToken}`,
                  [RETRY_HEADER]: '1',
                },
              });
              return next(retry);
            }),
            catchError(() => {
              clearSession(auth, router);
              return throwError(() => error);
            }),
          );
      }

      if (error.status === 401 && !req.url.includes('/vigia/')) {
        clearSession(auth, router);
      } else if (error.status === 403 && !req.url.includes('/vigia/')) {
        window.alert('No tienes permisos para esta accion');
      } else if (error.status >= 500 && !req.url.includes('/vigia/')) {
        window.alert('Error del servidor, intente nuevamente');
      }

      return throwError(() => error);
    }),
  );
};

function clearSession(auth: AuthService, router: Router): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  auth.currentUser.set(null);
  void router.navigate(['/auth/login']);
}
