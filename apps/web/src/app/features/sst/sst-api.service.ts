import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SstValoracion = 'SEGURO' | 'RIESGOSO' | 'N_A';
export type SstInspectionType = 'IPT_INICIAL' | 'SEGUIMIENTO';
export type SstInspectionStatus = 'BORRADOR' | 'COMPLETADA' | 'CERRADA';
export type SstPlanStatus = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO' | 'REINCIDENTE';
export type SstWorkplaceType =
  | 'PORTERIA'
  | 'RECEPCION'
  | 'PERIMETRO'
  | 'CCTV'
  | 'MOVIL'
  | 'ALTURAS'
  | 'OTRO';

export interface SstClient {
  id: string;
  nombre: string;
  nit: string | null;
  contacto: string | null;
  telefono: string | null;
}

export interface SstWorkplace {
  id: string;
  clientId: string;
  postId: string | null;
  nombre: string;
  direccion: string | null;
  ciudad: string;
  tipoPuesto: SstWorkplaceType;
  activo: boolean;
  client?: SstClient;
}

export interface SstChecklistItem {
  id: string;
  codigo: number;
  categoria: string;
  pregunta: string;
  sortOrder: number;
  activo: boolean;
}

export interface SstEvidence {
  id: string;
  urlArchivo: string;
  descripcion: string | null;
}

export interface SstResponseRow {
  id: string;
  itemId: string;
  valoracion: SstValoracion | null;
  valoracionAnterior: SstValoracion | null;
  hallazgo: string | null;
  planAccionPropuesto: string | null;
  responsablePlanAccion: string | null;
  fechaCompromiso: string | null;
  estadoPlanAccion: SstPlanStatus | null;
  reincidenciaCount: number;
  item?: SstChecklistItem;
  evidencias?: SstEvidence[];
  inspection?: SstInspection;
}

export interface SstInspection {
  id: string;
  workplaceId: string;
  tipo: SstInspectionType;
  fecha: string;
  responsableNombre: string;
  responsableCargo: string;
  estado: SstInspectionStatus;
  observacionesGenerales: string | null;
  cumplimientoGlobal: string | null;
  nivelRiesgo: string | null;
  workplace?: SstWorkplace;
  respuestas?: SstResponseRow[];
  createdAt: string;
}

export interface SstOverview {
  inspections: number;
  criticalAlerts: number;
  openPlans: number;
  recent: SstInspection[];
}

export interface SstReport {
  markdown: string;
  ascii: string;
  cumplimientoGlobal: string | null;
  nivelRiesgo: string | null;
}

@Injectable({ providedIn: 'root' })
export class SstApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sst`;

  overview(): Observable<SstOverview> {
    return this.http.get<SstOverview>(`${this.baseUrl}/overview`);
  }

  listClients(): Observable<SstClient[]> {
    return this.http.get<SstClient[]>(`${this.baseUrl}/clients`);
  }

  createClient(body: {
    nombre: string;
    nit?: string;
    contacto?: string;
    telefono?: string;
  }): Observable<SstClient> {
    return this.http.post<SstClient>(`${this.baseUrl}/clients`, body);
  }

  listWorkplaces(): Observable<SstWorkplace[]> {
    return this.http.get<SstWorkplace[]>(`${this.baseUrl}/workplaces`);
  }

  createWorkplace(body: {
    clientId: string;
    nombre: string;
    direccion?: string;
    ciudad?: string;
    tipoPuesto?: SstWorkplaceType;
    postId?: string;
  }): Observable<SstWorkplace> {
    return this.http.post<SstWorkplace>(`${this.baseUrl}/workplaces`, body);
  }

  listInspections(workplaceId?: string): Observable<SstInspection[]> {
    let params = new HttpParams();
    if (workplaceId) params = params.set('workplaceId', workplaceId);
    return this.http.get<SstInspection[]>(`${this.baseUrl}/inspections`, { params });
  }

  getInspection(id: string): Observable<SstInspection> {
    return this.http.get<SstInspection>(`${this.baseUrl}/inspections/${id}`);
  }

  createInspection(body: {
    workplaceId: string;
    tipo: SstInspectionType;
    fecha?: string;
    responsableNombre: string;
    responsableCargo?: string;
    observacionesGenerales?: string;
  }): Observable<SstInspection> {
    return this.http.post<SstInspection>(`${this.baseUrl}/inspections`, body);
  }

  saveInspection(
    id: string,
    body: {
      observacionesGenerales?: string;
      completar?: boolean;
      respuestas: Array<{
        itemId: string;
        valoracion: SstValoracion;
        hallazgo?: string;
        planAccionPropuesto?: string;
        responsablePlanAccion?: string;
        fechaCompromiso?: string;
        estadoPlanAccion?: SstPlanStatus;
      }>;
    },
  ): Observable<SstInspection> {
    return this.http.put<SstInspection>(`${this.baseUrl}/inspections/${id}`, body);
  }

  closeInspection(id: string): Observable<SstInspection> {
    return this.http.post<SstInspection>(`${this.baseUrl}/inspections/${id}/close`, {});
  }

  report(id: string): Observable<SstReport> {
    return this.http.get<SstReport>(`${this.baseUrl}/inspections/${id}/report`);
  }

  actionPlans(filter?: string): Observable<SstResponseRow[]> {
    let params = new HttpParams();
    if (filter) params = params.set('filter', filter);
    return this.http.get<SstResponseRow[]>(`${this.baseUrl}/action-plans`, { params });
  }
}
