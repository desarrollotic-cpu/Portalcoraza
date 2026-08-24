import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginResponse } from '../models/auth.model';
import { TENANT_KEY } from '../interceptors/tenant.interceptor';

const ACCESS_KEY = 'coraza_access';
const REFRESH_KEY = 'coraza_refresh';
const USER_KEY = 'coraza_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly currentUser = signal<AuthUser | null>(this.loadUser());

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
          if (res.user.tenantId) {
            localStorage.setItem(TENANT_KEY, res.user.tenantId);
          }
          this.currentUser.set(res.user);
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
    localStorage.removeItem(TENANT_KEY);
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

      const tenantId =
        parsed.tenantId || localStorage.getItem(TENANT_KEY) || '';
      if (tenantId) {
        localStorage.setItem(TENANT_KEY, tenantId);
      }

      return {
        id: parsed.id,
        email: parsed.email,
        fullName: parsed.fullName ?? null,
        role: parsed.role,
        permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
        tenantId,
      };
    } catch {
      return null;
    }
  }
}
