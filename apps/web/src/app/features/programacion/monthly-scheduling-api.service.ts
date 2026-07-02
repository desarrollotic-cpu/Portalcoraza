import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Jornada =
  | 'normal'
  | 'descanso_remunerado'
  | 'descanso_no_remunerado'
  | 'vacacion'
  | 'licencia'
  | 'suspension'
  | 'incapacidad'
  | 'accidente'
  | 'sin_asignar';

export type Turno = 'AM' | 'PM' | '24H';

export type ScheduleStatus = 'borrador' | 'publicado' | 'anulado';

export interface PersonalRole {
  rol: string;
  associateId: string | null;
  turnoId: string | null;
  displayName?: string;
}

export interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  day: number;
  role: string;
  associateId: string | null;
  turno: Turno | null;
  jornada: Jornada;
  codigo: string | null;
  inicio: string | null;
  fin: string | null;
}

export interface MonthlySchedule {
  id: string;
  postId: string;
  year: number;
  month: number;
  status: ScheduleStatus;
  personal: PersonalRole[];
  assignments: ScheduleAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface SavePayload {
  personal: PersonalRole[];
  assignments: Array<{
    day: number;
    role: string;
    associateId?: string | null;
    turno?: Turno | null;
    jornada: Jornada;
    codigo?: string | null;
    inicio?: string | null;
    fin?: string | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class MonthlySchedulingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scheduling/monthly`;

  getOne(postId: string, year: number, month: number): Observable<MonthlySchedule | null> {
    const params = new HttpParams()
      .set('postId', postId)
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<MonthlySchedule | null>(this.baseUrl, { params });
  }

  createOrGet(postId: string, year: number, month: number): Observable<MonthlySchedule> {
    return this.http.post<MonthlySchedule>(this.baseUrl, { postId, year, month });
  }

  save(id: string, payload: SavePayload): Observable<MonthlySchedule> {
    return this.http.put<MonthlySchedule>(`${this.baseUrl}/${id}`, payload);
  }

  updateStatus(id: string, status: ScheduleStatus): Observable<MonthlySchedule> {
    return this.http.patch<MonthlySchedule>(`${this.baseUrl}/${id}/status`, { status });
  }

  generateMotor(id: string, roles?: string[]): Observable<MonthlySchedule> {
    return this.http.post<MonthlySchedule>(`${this.baseUrl}/${id}/motor`, { roles });
  }
}
