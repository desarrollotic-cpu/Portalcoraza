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



@Injectable({ providedIn: 'root' })

export class AssociatesApiService {

  private readonly hr = inject(HrApiService);



  list(status?: string): Observable<Associate[]> {

    const query = status ? { status: status as AssociateStatus } : {};

    return this.hr.listAssociates(query).pipe(map((rows) => rows.map(toLegacy)));

  }



  getById(id: string): Observable<Associate> {

    return this.hr.getAssociate(id).pipe(map(toLegacy));

  }

}


