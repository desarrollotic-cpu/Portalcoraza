import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VigiaAuthService } from '../vigia/vigia-auth.service';

@Injectable({ providedIn: 'root' })
export class MinutaApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(VigiaAuthService);
  private readonly base = `${environment.apiUrl}/minuta`;

  private opts() {
    return { headers: this.auth.authHeaders() };
  }

  diagnostico(): Observable<unknown> {
    return this.http.get(`${this.base}/diagnostico`);
  }

  dashboard(): Observable<{
    stats: {
      registrosHoy: number;
      visitantesHoy: number;
      incidentesHoy: number;
      eficiencia: number;
      correspondenciaPendiente: number;
      activosEnSitio: number;
    };
  }> {
    return this.http.get<{
      stats: {
        registrosHoy: number;
        visitantesHoy: number;
        incidentesHoy: number;
        eficiencia: number;
        correspondenciaPendiente: number;
        activosEnSitio: number;
      };
    }>(`${this.base}/dashboard`, this.opts());
  }

  historial(limite = 20, tipo = 'TODOS'): Observable<{ historial: unknown[] }> {
    return this.http.get<{ historial: unknown[] }>(
      `${this.base}/historial?limite=${limite}&tipo=${encodeURIComponent(tipo)}`,
      this.opts(),
    );
  }

  post(path: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.base}/${path}`, body, this.opts());
  }

  salida(id: string, tipo: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/salida`, { tipo }, this.opts());
  }

  entregarCorr(id: string, recibidoPor: string): Observable<unknown> {
    return this.http.patch(
      `${this.base}/correspondencia/${id}/entregar`,
      { recibidoPor },
      this.opts(),
    );
  }
}
