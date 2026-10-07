import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ConversionZona {
  nombre: string;
  numero: number | null;
  asociados: number;
}

export interface ConversionTotal {
  codigo: string;
  filas: number;
  suma: number;
}

export interface ConversionPersona {
  zona?: string;
  cedula: string;
  nombre: string;
  valor: number;
}

export interface ConversionPreview {
  periodo: {
    anio: number | null;
    mes: number | null;
    quincena: 'Primera' | 'Segunda' | null;
    periodo: string | null;
    fecha: string | null;
  };
  zonas: ConversionZona[];
  totalFilas: number;
  totales: ConversionTotal[];
  bonificaciones: ConversionPersona[];
  totalBonificaciones: number;
  advertencias: string[];
}

@Injectable({ providedIn: 'root' })
export class PayrollConversionApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/payroll/conversion`;

  previsualizar(file: File): Observable<ConversionPreview> {
    return this.http.post<ConversionPreview>(`${this.baseUrl}/previsualizar`, this.form(file));
  }

  descargarBase(file: File, periodo: string, fecha: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/generar/base`, this.form(file, periodo, fecha), {
      responseType: 'blob',
    });
  }

  descargarResumen(file: File, periodo: string, fecha: string): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/generar/resumen`, this.form(file, periodo, fecha), {
      responseType: 'blob',
    });
  }

  /** Mensaje en español del error; si la respuesta vino como Blob (descargas) la lee como JSON. */
  async mensajeError(e: unknown): Promise<string> {
    const err = e as HttpErrorResponse;
    let body: unknown = err?.error;
    if (body instanceof Blob) {
      try {
        body = JSON.parse(await body.text());
      } catch {
        body = null;
      }
    }
    const m = (body as { message?: string | string[] } | null)?.message;
    if (Array.isArray(m)) return m.join(' ');
    if (m) return m;
    if (err?.status === 403) return 'No tienes permiso para usar la conversión de nómina.';
    return 'No se pudo procesar el archivo. Intenta de nuevo.';
  }

  private form(file: File, periodo?: string, fecha?: string): FormData {
    const fd = new FormData();
    fd.append('file', file);
    if (periodo) fd.append('periodo', periodo);
    if (fecha) fd.append('fecha', fecha);
    return fd;
  }
}
