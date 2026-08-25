import { Injectable, inject } from '@angular/core';

import { Observable, map } from 'rxjs';

import { HrApiService } from './services/hr-api.service';

import type { Associate as HrAssociate, AssociateStatus } from './services/hr.types';



/**

 * Shim de compatibilidad con el modelo antiguo de asociados.

 * Otros módulos (Dotación, Programación) siguen consumiendo esta API con la

 * forma "plana" (firstName / lastName / phone). Este servicio mapea al nuevo

 * modelo HRM (60+ campos, nombres partidos, celular) para no romper los

 * componentes existentes mientras el resto del sistema migra.

 *

 * Para selector de dotación (ACTIVO/VACACIONES) usar

 * `InventoryApiService.listEligibleAssociates()` — no requiere associates.view.

 */



export interface Associate {

  id: string;

  documentNumber: string;

  firstName: string;

  lastName: string;

  phone: string | null;

  email: string | null;

  status: AssociateStatus;

}



function toLegacy(a: HrAssociate): Associate {

  const lastName = [a.firstLastName, a.secondLastName].filter(Boolean).join(' ');

  return {

    id: a.id,

    documentNumber: a.documentNumber,

    firstName: [a.firstName, a.secondName].filter(Boolean).join(' '),

    lastName,

    phone: a.mobile,

    email: a.email,

    status: a.status,

  };

}



import { HttpClient, HttpParams } from '@angular/common/http';
import { shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AssociatesApiService {
  private readonly http = inject(HttpClient);
  private readonly hr = inject(HrApiService);
  private lookupCache$ = new Map<string, Observable<Associate[]>>();

  lookup(status?: string, forceRefresh = false): Observable<Associate[]> {
    const key = status || '__all__';
    if (!this.lookupCache$.has(key) || forceRefresh) {
      let params = new HttpParams();
      if (status) params = params.set('status', status);
      const obs$ = this.http
        .get<Associate[]>(`${environment.apiUrl}/associates/lookup`, { params })
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.lookupCache$.set(key, obs$);
    }
    return this.lookupCache$.get(key)!;
  }

  list(status?: string): Observable<Associate[]> {
    const query = status ? { status: status as AssociateStatus } : {};
    return this.hr.listAssociates({ ...query, page: 1, limit: 2000 }).pipe(map((res) => res.items.map(toLegacy)));
  }

  getById(id: string): Observable<Associate> {
    return this.hr.getAssociate(id).pipe(map(toLegacy));
  }
}


