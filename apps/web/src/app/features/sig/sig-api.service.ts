import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SigObjetivo {
  id: string;
  perspectiva: string;
  objetivoTexto: string;
  estrategia: string | null;
  sistema: string | null;
  indicadoresCount: number;
}

export interface SigIndicador {
  id: string;
  codigo: string;
  nombre: string;
  objetivoId: string;
  subsistema: string;
  proposito: string | null;
  formula: string | null;
  frecuencia: string;
  sentido: string;
  area: string;
  activo: boolean;
  responsable: string | null;
}

export interface SigResultado {
  id: string;
  anio: number;
  periodo: string;
  metaSnapshot: string;
  valorResultado: string;
  observaciones: string | null;
  colorSemaforo: string;
  seguimiento: string;
}

export interface SigDashboard {
  anio: number;
  area: string;
  counts: { AZUL: number; VERDE: number; AMARILLO: number; ROJO: number; SIN_DATO: number };
  items: Array<{
    id: string;
    codigo: string;
    nombre: string;
    area: string;
    frecuencia: string;
    sentido: string;
    color: string | null;
    meta: number | null;
    resultado: number | null;
    periodo: string | null;
    serie: Array<{ periodo: string; meta: number; resultado: number; color: string }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class SigApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/sig`;

  diagnostico(): Observable<unknown> {
    return this.http.get(`${this.base}/diagnostico`);
  }

  objetivos(): Observable<SigObjetivo[]> {
    return this.http.get<SigObjetivo[]>(`${this.base}/objetivos`);
  }

  indicadores(q: Record<string, string> = {}): Observable<SigIndicador[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(q)) {
      if (v) params = params.set(k, v);
    }
    return this.http.get<SigIndicador[]>(`${this.base}/indicadores`, { params });
  }

  patchIndicador(id: string, body: Partial<SigIndicador>): Observable<SigIndicador> {
    return this.http.patch<SigIndicador>(`${this.base}/indicadores/${id}`, body);
  }

  resultados(indicadorId: string, anio?: number): Observable<SigResultado[]> {
    let params = new HttpParams().set('indicadorId', indicadorId);
    if (anio) params = params.set('anio', String(anio));
    return this.http.get<SigResultado[]>(`${this.base}/resultados`, { params });
  }

  capturar(body: {
    indicadorId: string;
    anio: number;
    periodo: string;
    meta: number;
    resultado: number;
    observaciones?: string;
    seguimiento?: string;
  }): Observable<{ colorSemaforo: string }> {
    return this.http.post<{ colorSemaforo: string }>(`${this.base}/resultados`, body);
  }

  dashboard(area?: string, anio?: number): Observable<SigDashboard> {
    let params = new HttpParams();
    if (area) params = params.set('area', area);
    if (anio) params = params.set('anio', String(anio));
    return this.http.get<SigDashboard>(`${this.base}/dashboard`, { params });
  }
}
