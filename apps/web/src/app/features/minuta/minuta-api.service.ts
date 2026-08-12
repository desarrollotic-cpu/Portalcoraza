import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MinutaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/minuta`;

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
    }>(`${this.base}/dashboard`);
  }

  historial(limite = 20, tipo = 'TODOS'): Observable<{ historial: unknown[] }> {
    return this.http.get<{ historial: unknown[] }>(
      `${this.base}/historial?limite=${limite}&tipo=${encodeURIComponent(tipo)}&scope=TODOS`,
    );
  }

  post(path: string, body: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.base}/${path}`, body);
  }

  salida(id: string, tipo: string): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/salida`, { tipo });
  }

  entregarCorr(id: string, recibidoPor: string): Observable<unknown> {
    return this.http.patch(`${this.base}/correspondencia/${id}/entregar`, {
      recibidoPor,
    });
  }
}
