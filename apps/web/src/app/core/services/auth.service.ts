import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
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

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
        email,
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

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    this.http
      .post(`${environment.apiUrl}/auth/logout`, { refreshToken })
      .subscribe({ complete: () => this.clearSession() });
    this.clearSession();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
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
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
