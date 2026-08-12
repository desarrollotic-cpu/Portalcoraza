import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'coraza_vigia_token';
const SESSION_KEY = 'coraza_vigia_session';
const TURNO_KEY = 'coraza_vigia_turno_id';
const OFFLINE_PIN_KEY = 'coraza_vigia_offline_pin';

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

  private persistSession(res: Record<string, unknown>, pin?: string): void {
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
    if (pin) {
      void this.saveOfflinePin(session.empleado.cedula, pin, session);
    }
  }

  login(cedula: string, pin: string): Observable<Record<string, unknown>> {
    return this.http
      .post<Record<string, unknown>>(`${this.base}/auth/login`, { cedula, pin })
      .pipe(tap((res) => this.persistSession(res, pin)));
  }

  setupPin(
    cedula: string,
    nombre: string,
    pin: string,
  ): Observable<Record<string, unknown>> {
    return this.http
      .post<Record<string, unknown>>(`${this.base}/auth/setup`, {
        cedula,
        nombre,
        pin,
      })
      .pipe(tap((res) => this.persistSession(res, pin)));
  }

  /** Offline: solo si ya hubo login online con ese cédula+PIN en este dispositivo. */
  loginOffline(cedula: string, pin: string): Observable<boolean> {
    return from(this.matchOfflinePin(cedula, pin)).pipe(
      switchMap(async (ok) => {
        if (!ok) return false;
        const raw = localStorage.getItem(OFFLINE_PIN_KEY);
        if (!raw) return false;
        const stored = JSON.parse(raw) as {
          cedula: string;
          empleado?: VigiaEmpleado;
          puesto_id?: string;
          puesto_nombre?: string;
        };
        const session: VigiaSession = {
          empleado: stored.empleado || {
            id: 'local',
            cedula: cedula.replace(/\D/g, ''),
            primer_nombre: 'Vigilante',
            nombre_completo: 'Vigilante',
            cargo: 'Vigilante',
            estado: 'ACTIVO',
            telefono: '',
          },
          inicio_timestamp: Date.now(),
          puesto_id: stored.puesto_id || 'PUE-01',
          puesto_nombre: stored.puesto_nombre || 'Puesto local',
          accessToken: 'local',
        };
        localStorage.setItem(TOKEN_KEY, 'local');
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(TURNO_KEY, `TUR-${Date.now()}`);
        this.session.set(session);
        return true;
      }),
    );
  }

  private async saveOfflinePin(
    cedula: string,
    pin: string,
    session: VigiaSession,
  ): Promise<void> {
    const pinHash = await this.sha256(`${cedula.replace(/\D/g, '')}:${pin}`);
    localStorage.setItem(
      OFFLINE_PIN_KEY,
      JSON.stringify({
        cedula: cedula.replace(/\D/g, ''),
        pinHash,
        empleado: session.empleado,
        puesto_id: session.puesto_id,
        puesto_nombre: session.puesto_nombre,
      }),
    );
  }

  private async matchOfflinePin(cedula: string, pin: string): Promise<boolean> {
    try {
      const raw = localStorage.getItem(OFFLINE_PIN_KEY);
      if (!raw) return false;
      const stored = JSON.parse(raw) as { cedula: string; pinHash: string };
      const c = cedula.replace(/\D/g, '');
      if (stored.cedula !== c) return false;
      const hash = await this.sha256(`${c}:${pin}`);
      return hash === stored.pinHash;
    } catch {
      return false;
    }
  }

  private async sha256(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
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
