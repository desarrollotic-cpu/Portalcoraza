import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

const CAMPO_TOKEN = 'rondas_campo_token';
const CAMPO_POST = 'rondas_campo_post';
const CAMPO_MARCAS = 'rondas_campo_marcas';
const CAMPO_DEVICE = 'rondas_campo_device';

export type RondasPost = {
  id: string;
  code?: string;
  name: string;
  clientName?: string | null;
};

export type RondasPunto = {
  id: string;
  postId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  altitud?: number | null;
  radioMetros: number;
  orden: number;
  activo: boolean;
  puestoNombre?: string;
};

export type RondasHoy = {
  fecha: string;
  cumplimientoPct: number;
  rondasCompletas: number;
  puestos: number;
  porPuesto: Array<{
    postId: string;
    puestoNombre: string;
    esperados: number;
    marcados: number;
    porcentaje: number;
    completa: boolean;
  }>;
  marcaciones: Array<{
    id: string;
    fechaHora: string;
    puntoNombre: string;
    puestoNombre: string;
    vigilanteNombre: string;
    distanciaAlPunto: number;
    desfaseReloj: boolean;
  }>;
  alertas: Array<{
    id: string;
    tipo: string;
    mensaje: string;
    fechaHora: string;
    latitud: number | null;
    longitud: number | null;
    puestoNombre: string;
    vigilanteNombre: string;
  }>;
};

@Injectable({ providedIn: 'root' })
export class RondasApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/rondas`;

  deviceId(): string {
    let id = localStorage.getItem(CAMPO_DEVICE);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CAMPO_DEVICE, id);
    }
    return id;
  }

  postVinculado(): { id: string; name: string } | null {
    try {
      return JSON.parse(localStorage.getItem(CAMPO_POST) || 'null');
    } catch {
      return null;
    }
  }

  vincularPost(post: { id: string; name: string }) {
    localStorage.setItem(CAMPO_POST, JSON.stringify(post));
  }

  quitarPost() {
    localStorage.removeItem(CAMPO_POST);
  }

  campoToken(): string | null {
    return localStorage.getItem(CAMPO_TOKEN);
  }

  setCampoSesion(token: string) {
    localStorage.setItem(CAMPO_TOKEN, token);
  }

  clearCampoSesion() {
    localStorage.removeItem(CAMPO_TOKEN);
  }

  puestosCampo(): Observable<RondasPost[]> {
    return this.http.get<RondasPost[]>(`${this.base}/campo/puestos`);
  }

  asociados(postId: string): Observable<{
    post: { id: string; name: string };
    asociados: Array<{ id: string; nombre: string }>;
  }> {
    return this.http.get<{
      post: { id: string; name: string };
      asociados: Array<{ id: string; nombre: string }>;
    }>(`${this.base}/campo/asociados`, { params: { postId } });
  }

  entrar(
    postId: string,
    associateId: string,
    documentNumber: string,
  ): Observable<{
    accessToken: string;
    vigilante: { id: string; nombre: string };
    post: { id: string; name: string };
  }> {
    return this.http.post<{
      accessToken: string;
      vigilante: { id: string; nombre: string };
      post: { id: string; name: string };
    }>(`${this.base}/campo/entrar`, { postId, associateId, documentNumber });
  }

  puntosCampo(): Observable<RondasPunto[]> {
    return this.http.get<RondasPunto[]>(`${this.base}/campo/puntos`, {
      headers: this.campoHeaders(),
    });
  }

  enviarMarcaciones(marcaciones: Array<{
    uuidCliente: string;
    puntoId: string;
    latitud: number;
    longitud: number;
    precisionMetros: number;
    fechaHora: string;
    dispositivoId: string;
    altitud?: number | null;
  }>): Observable<{
    aceptadas: string[];
    duplicadas: string[];
    rechazadas: Array<{ uuid: string; motivo: string }>;
  }> {
    return this.http.post<{
      aceptadas: string[];
      duplicadas: string[];
      rechazadas: Array<{ uuid: string; motivo: string }>;
    }>(`${this.base}/campo/marcaciones`, { marcaciones }, {
      headers: this.campoHeaders(),
    });
  }

  enviarAlertas(alertas: Array<{
    uuidCliente: string;
    tipo: string;
    mensaje: string;
    latitud: number | null;
    longitud: number | null;
    fechaHora: string;
    dispositivoId: string;
  }>): Observable<{
    aceptadas: string[];
    duplicadas: string[];
    rechazadas: Array<{ uuid: string; motivo: string }>;
  }> {
    return this.http.post<{
      aceptadas: string[];
      duplicadas: string[];
      rechazadas: Array<{ uuid: string; motivo: string }>;
    }>(`${this.base}/campo/alertas`, { alertas }, {
      headers: this.campoHeaders(),
    });
  }

  puestosSetup(): Observable<RondasPost[]> {
    return this.http
      .get<Array<{ id: string; name: string; code?: string; status?: string; clientName?: string | null }>>(
        `${environment.apiUrl}/posts`,
      )
      .pipe(
        map((rows) =>
          rows
            .filter((p) => p.status !== 'INACTIVO')
            .map((p) => ({
              id: p.id,
              name: p.name,
              code: p.code,
              clientName: p.clientName,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es')),
        ),
      );
  }

  hoy(postId?: string): Observable<RondasHoy> {
    return this.http.get<RondasHoy>(`${this.base}/hoy`, {
      ...(postId ? { params: { postId } } : {}),
    });
  }

  puntosAdmin(postId?: string): Observable<RondasPunto[]> {
    return this.http.get<RondasPunto[]>(`${this.base}/puntos`, {
      ...(postId ? { params: { postId } } : {}),
    });
  }

  crearPunto(body: {
    postId: string;
    nombre: string;
    latitud: number;
    longitud: number;
    altitud?: number | null;
    radioMetros?: number;
    precisionMetros?: number;
    orden?: number;
  }): Observable<RondasPunto> {
    return this.http.post<RondasPunto>(`${this.base}/puntos`, body);
  }

  actualizarPunto(
    id: string,
    body: { nombre?: string; radioMetros?: number },
  ): Observable<RondasPunto> {
    return this.http.patch<RondasPunto>(`${this.base}/puntos/${id}`, body);
  }

  eliminarPunto(id: string): Observable<{ ok: boolean; id: string }> {
    return this.http.delete<{ ok: boolean; id: string }>(`${this.base}/puntos/${id}`);
  }

  private campoHeaders(): HttpHeaders {
    const t = this.campoToken();
    return new HttpHeaders(t ? { Authorization: `Bearer ${t}` } : {});
  }
}
