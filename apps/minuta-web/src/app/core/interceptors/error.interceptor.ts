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
import { AuthUser } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { TENANT_KEY } from './tenant.interceptor';

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
        !req.headers.has(RETRY_HEADER)
      ) {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) {
          clearSession(auth, router);
          return throwError(() => error);
        }

        return rawHttp
          .post<{ accessToken: string; user?: AuthUser }>(
            `${environment.apiUrl}/auth/refresh`,
            { refreshToken },
          )
          .pipe(
            switchMap((res) => {
              localStorage.setItem(ACCESS_KEY, res.accessToken);
              if (res.user) {
                localStorage.setItem(USER_KEY, JSON.stringify(res.user));
                if (res.user.tenantId) {
                  localStorage.setItem(TENANT_KEY, res.user.tenantId);
                }
                auth.currentUser.set(res.user);
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

      if (error.status === 401) {
        clearSession(auth, router);
      }

      return throwError(() => error);
    }),
  );
};

function clearSession(auth: AuthService, router: Router): void {
  auth.discardSession();
  void router.navigateByUrl('/login');
}
