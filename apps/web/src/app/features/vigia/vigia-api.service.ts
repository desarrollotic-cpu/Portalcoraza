import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VigiaAuthService } from './vigia-auth.service';

@Injectable({ providedIn: 'root' })
export class VigiaApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(VigiaAuthService);
  private readonly base = `${environment.apiUrl}/vigia`;

  private opts() {
    return { headers: this.auth.authHeaders() };
  }

  turnero(year: number, month: number): Observable<unknown> {
    return this.http.get(`${this.base}/turnero?year=${year}&month=${month}`, this.opts());
  }

  consignas(puestoId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(
      `${this.base}/consignas?puesto_id=${encodeURIComponent(puestoId)}`,
      this.opts(),
    );
  }

  sos(body: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.base}/sos`, body, this.opts());
  }

  dotacion(): Observable<Array<{ nombre: string; estado: string }>> {
    return this.http.get<Array<{ nombre: string; estado: string }>>(
      `${this.base}/dotacion`,
      this.opts(),
    );
  }

  firmarDotacion(items: string, firmaBase64: string): Observable<unknown> {
    return this.http.post(`${this.base}/dotacion/firmar`, { items, firmaBase64 }, this.opts());
  }

  solicitarDotacion(motivo: string, fotoBase64: string): Observable<unknown> {
    const s = this.auth.session();
    return this.http.post(
      `${this.base}/dotacion/solicitar`,
      {
        motivo,
        fotoBase64,
        postId: s?.puesto_id,
        turnoId: this.auth.turnoId(),
      },
      this.opts(),
    );
  }

  nomina(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.base}/nomina`, this.opts());
  }

  reclamar(periodo: string, motivo: string, detalle: string): Observable<unknown> {
    return this.http.post(
      `${this.base}/nomina/reclamar`,
      { periodo, motivo, detalle },
      this.opts(),
    );
  }

  cerrarTurno(relevoNombre: string, relevoFotoBase64?: string): Observable<unknown> {
    const id = this.auth.turnoId();
    return this.http.post(
      `${this.base}/turnos/${id}/cierre`,
      { relevoNombre, relevoFotoBase64 },
      this.opts(),
    );
  }
}
