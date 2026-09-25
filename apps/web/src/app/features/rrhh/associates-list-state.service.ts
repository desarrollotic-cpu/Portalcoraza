import { Injectable } from '@angular/core';
import type { AssociatesQuery } from './services/hr.types';

/** Estado del directorio entre listado ↔ detalle (filtros, página, meses). */
@Injectable({ providedIn: 'root' })
export class AssociatesListState {
  query: AssociatesQuery = { status: 'ACTIVO' };
  page = 1;
  tenureBucket = '';
  hireMonth = '';
  retiredMonth = '';
}
