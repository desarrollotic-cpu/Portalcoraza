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

export interface SchedulePostSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  clientName: string | null;
  status: string;
}

export interface MonthlyScheduleWithPost extends MonthlySchedule {
  post: SchedulePostSummary | null;
}

export interface ScheduleConflict {
  associateId: string;
  day: number;
  postCount: number;
  postIds: string[];
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

  listByMonth(year: number, month: number): Observable<MonthlyScheduleWithPost[]> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<MonthlyScheduleWithPost[]>(`${this.baseUrl}/by-month`, { params });
  }

  findConflicts(year: number, month: number): Observable<ScheduleConflict[]> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<ScheduleConflict[]>(`${this.baseUrl}/conflicts`, { params });
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

  generateMotor(
    id: string,
    opts?: { roles?: string[]; tipoCiclo?: '12x3' | '10x5' | '2x2' | '13x2' },
  ): Observable<MonthlySchedule & { motorAlerts?: unknown[] }> {
    return this.http.post<MonthlySchedule & { motorAlerts?: unknown[] }>(
      `${this.baseUrl}/${id}/motor`,
      opts ?? {},
    );
  }

  generateMotorGlobal(payload: {
    year: number;
    month: number;
    tipoCiclo?: '12x3' | '10x5' | '2x2' | '13x2';
    createMissing?: boolean;
  }): Observable<{
    year: number;
    month: number;
    tipoCiclo: string;
    processed: number;
    ok: number;
    failed: number;
  }> {
    return this.http.post<{
      year: number;
      month: number;
      tipoCiclo: string;
      processed: number;
      ok: number;
      failed: number;
    }>(`${this.baseUrl}/motor-global`, payload);
  }

  listTemplates(): Observable<ScheduleTemplate[]> {
    return this.http.get<ScheduleTemplate[]>(`${this.baseUrl}/templates`);
  }

  createTemplate(payload: {
    name: string;
    fromScheduleId?: string;
    postId?: string | null;
  }): Observable<ScheduleTemplate> {
    return this.http.post<ScheduleTemplate>(`${this.baseUrl}/templates`, payload);
  }

  applyTemplate(scheduleId: string, templateId: string): Observable<MonthlySchedule> {
    return this.http.post<MonthlySchedule>(
      `${this.baseUrl}/${scheduleId}/apply-template/${templateId}`,
      {},
    );
  }
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  postId: string | null;
  personal: PersonalRole[];
  patron: Array<{
    diaRelativo: number;
    rol: string;
    turno: string | null;
    jornada: string;
    codigo?: string | null;
  }>;
  createdAt: string;
}
