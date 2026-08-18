import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginResponse } from '../models/auth.model';

const ACCESS_KEY = 'coraza_access';
const REFRESH_KEY = 'coraza_refresh';
const USER_KEY = 'coraza_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  constructor() {
    // Menú usa coraza_user; el access JWT puede traer permisos más frescos tras grants en BD.
    this.syncPermissionsFromAccessToken();
  }

  /** Actualiza permisos del usuario en memoria/localStorage desde el JWT actual. */
  syncPermissionsFromAccessToken(): void {
    const token = this.getAccessToken();
    const user = this.currentUser();
    if (!token || !user) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as {
        permissions?: string[];
      };
      if (!Array.isArray(payload.permissions)) return;
      const same =
        payload.permissions.length === user.permissions.length &&
        payload.permissions.every((p) => user.permissions.includes(p));
      if (same) return;
      const next: AuthUser = { ...user, permissions: payload.permissions };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      this.currentUser.set(next);
    } catch {
      /* token malformado: ignorar */
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        email: email.trim().toLowerCase(),
        password,
      })
      .pipe(
        tap((res) => {
          localStorage.setItem(ACCESS_KEY, res.accessToken);
          localStorage.setItem(REFRESH_KEY, res.refreshToken);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }),
      );
  }

  /** Relee permisos desde el servidor (p. ej. tras grants nuevos en BD). */
  refreshSession(): Observable<{ accessToken: string; user?: AuthUser }> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('Sin refresh token'));
    }
    return this.http
      .post<{ accessToken: string; user?: AuthUser }>(
        `${environment.apiUrl}/auth/refresh`,
        { refreshToken },
      )
      .pipe(
        tap((res) => {
          localStorage.setItem(ACCESS_KEY, res.accessToken);
          if (res.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(res.user));
            this.currentUser.set(res.user);
          } else {
            this.syncPermissionsFromAccessToken();
          }
        }),
      );
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    this.http
      .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
      .subscribe({ complete: () => this.clearSession() });
    this.clearSession();
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(
      `${environment.apiUrl}/auth/change-password`,
      { currentPassword, newPassword },
    );
  }

  recoverAdmin(
    recoveryKey: string,
    newPassword: string,
  ): Observable<{ ok: boolean; message: string; email: string }> {
    return this.http.post<{ ok: boolean; message: string; email: string }>(
      `${environment.apiUrl}/auth/recover-admin`,
      { recoveryKey, newPassword },
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  hasPermission(code: string): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    return user.permissions.includes(code);
  }

  private clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private loadUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<AuthUser>;
      if (!parsed.id || !parsed.email || !parsed.role) {
        return null;
      }

      return {
        id: parsed.id,
        email: parsed.email,
        fullName: parsed.fullName ?? null,
        role: parsed.role,
        permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
        warehouseId: parsed.warehouseId ?? null,
        warehouse: parsed.warehouse ?? null,
      };
    } catch {
      return null;
    }
  }
}
