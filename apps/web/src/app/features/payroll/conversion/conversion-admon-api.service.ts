import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ConversionTotal } from './payroll-conversion-api.service';

export type ModoCodigoDoble = 'combinado' | 'habitual';

export interface ColumnaConcepto {
  columna: number;
  encabezado: string;
  codigo: string;
  codigoAlterno: string | null;
}

/** Línea que admite dos códigos; solo aparece en modo «habitual». */
export interface DobleCodigo {
  cedula: string;
  nombre: string;
  encabezado: string;
  codigoAsignado: string;
  codigoAlterno: string;
  valor: number;
}

export interface ConversionAdmonPreview {
  periodo: {
    anio: number | null;
    mes: number | null;
    quincena: 'Primera' | 'Segunda' | null;
    periodo: string | null;
    fecha: string | null;
  };
  hojas: string[];
  hojaUsada: string;
  empleados: number;
  totalFilas: number;
  totales: ConversionTotal[];
  columnas: ColumnaConcepto[];
  dobleCodigo: DobleCodigo[];
  advertencias: string[];
}

export interface AjusteCodigo {
  cedula: string;
  de: string;
  a: string;
}

@Injectable({ providedIn: 'root' })
export class ConversionAdmonApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/payroll/conversion-admon`;

  previsualizar(
    file: File,
    hoja?: string,
    modo?: ModoCodigoDoble,
  ): Observable<ConversionAdmonPreview> {
    return this.http.post<ConversionAdmonPreview>(
      `${this.baseUrl}/previsualizar`,
      this.form(file, { hoja, modo }),
    );
  }

  descargar(
    file: File,
    opciones: {
      hoja?: string;
      modo?: ModoCodigoDoble;
      periodo?: string;
      fecha?: string;
      ajustes?: AjusteCodigo[];
    },
  ): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/generar/base`, this.form(file, opciones), {
      responseType: 'blob',
    });
  }

  /** Mensaje en español; si la respuesta vino como Blob (descargas) la lee como JSON. */
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

  private form(
    file: File,
    o: {
      hoja?: string;
      modo?: ModoCodigoDoble;
      periodo?: string;
      fecha?: string;
      ajustes?: AjusteCodigo[];
    },
  ): FormData {
    const fd = new FormData();
    fd.append('file', file);
    if (o.hoja) fd.append('hoja', o.hoja);
    if (o.modo) fd.append('modoCodigoDoble', o.modo);
    if (o.periodo) fd.append('periodo', o.periodo);
    if (o.fecha) fd.append('fecha', o.fecha);
    if (o.ajustes?.length) fd.append('ajustes', JSON.stringify(o.ajustes));
    return fd;
  }
}
