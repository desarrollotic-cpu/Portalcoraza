import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'coraza_vigia_token';
const SESSION_KEY = 'coraza_vigia_session';
const TURNO_KEY = 'coraza_vigia_turno_id';

export interface VigiaEmpleado {
  id: string;
  cedula: string;
  primer_nombre: string;
  nombre_completo: string;
  cargo: string;
  estado: string;
  telefono: string;
}

export interface VigiaSession {
  empleado: VigiaEmpleado;
  inicio_timestamp: number;
  puesto_id: string;
  puesto_nombre: string;
  accessToken: string;
}

@Injectable({ providedIn: 'root' })
export class VigiaAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/vigia`;

  readonly session = signal<VigiaSession | null>(this.load());

  private load(): VigiaSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (!raw || !token) return null;
      const parsed = JSON.parse(raw) as VigiaSession;
      return { ...parsed, accessToken: token };
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.session()?.accessToken;
  }

  authHeaders(): HttpHeaders {
    const t = this.session()?.accessToken || localStorage.getItem(TOKEN_KEY) || '';
    return new HttpHeaders({ Authorization: `Bearer ${t}` });
  }

  login(cedula: string, nombre: string): Observable<Record<string, unknown>> {
    return this.http
      .post<Record<string, unknown>>(`${this.base}/auth/login`, { cedula, nombre })
      .pipe(
        tap((res) => {
          if (!res['success'] || !res['accessToken']) return;
          const session: VigiaSession = {
            empleado: res['empleado'] as VigiaEmpleado,
            inicio_timestamp: Number(res['inicio_timestamp'] || Date.now()),
            puesto_id: String(res['puesto_id']),
            puesto_nombre: String(res['puesto_nombre']),
            accessToken: String(res['accessToken']),
          };
          localStorage.setItem(TOKEN_KEY, session.accessToken);
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          localStorage.setItem(TURNO_KEY, String(res['turno_id']));
          this.session.set(session);
        }),
      );
  }

  /** Offline fallback local (solo si API cae). */
  loginOffline(cedula: string, nombre: string): boolean {
    const c = cedula.replace(/\D/g, '');
    const n = nombre.trim();
    if (c.length < 4 || n.length < 2) return false;
    const session: VigiaSession = {
      empleado: {
        id: 'local',
        cedula: c,
        primer_nombre: n,
        nombre_completo: n,
        cargo: 'Vigilante',
        estado: 'ACTIVO',
        telefono: '',
      },
      inicio_timestamp: Date.now(),
      puesto_id: 'PUE-01',
      puesto_nombre: 'Puesto local',
      accessToken: 'local',
    };
    localStorage.setItem(TOKEN_KEY, 'local');
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(TURNO_KEY, `TUR-${Date.now()}`);
    this.session.set(session);
    return true;
  }

  turnoId(): string | null {
    return localStorage.getItem(TURNO_KEY);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TURNO_KEY);
    this.session.set(null);
    void this.router.navigateByUrl('/vigia/login');
  }
}
