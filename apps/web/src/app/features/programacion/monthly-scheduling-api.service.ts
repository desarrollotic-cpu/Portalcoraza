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
  associateName?: string | null;
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
  resolvedAssociates?: Array<{
    id: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    status: string;
  }>;
}

export interface SchedulePostSummary {
  id: string;
  code: string;
  name: string;
  type: string;
  clientName: string | null;
  status: string;
}

export interface ScheduleConflict {
  associateId: string;
  day: number;
  postCount: number;
  postIds: string[];
}

export interface ProgramacionOverview {
  year: number;
  month: number;
  catalog: {
    total: number;
    active: number;
    inactive: number;
  };
  kpis: {
    postsInMonth: number;
    postsCovered: number;
    postsUncovered: number;
    assignedCells: number;
    distinctAssociates: number;
    conflicts: number;
    templates: number;
  };
  series: Array<{ key: string; label: string; value: number }>;
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
  confirmWarnings?: boolean;
}

export type ScheduleAlertType =
  | 'hueco_cobertura'
  | 'asociado_inactivo'
  | 'conflicto_mismo_turno'
  | 'carga_sobre_24';

export interface ScheduleAlertItem {
  id: string;
  type: ScheduleAlertType;
  severity: 'error' | 'warning';
  month: string;
  day?: number;
  postId: string;
  postName: string;
  associateId?: string;
  associateName?: string;
  documentNumber?: string;
  role?: string;
  shift?: 'D' | 'N';
  otherPostId?: string;
  otherPostName?: string;
  reason?: string;
  suggestedAction?: string;
  message: string;
}

export interface MonthlyAlertsResponse {
  generatedAt: string;
  months: string[];
  totals: {
    huecos: number;
    inactivos: number;
    conflictos: number;
    carga: number;
  };
  alerts: ScheduleAlertItem[];
}

export interface BoardAlertsResponse {
  month: string;
  postId: string;
  cells: Array<{
    day: number;
    types: ScheduleAlertType[];
    severity: 'error' | 'warning';
    messages: string[];
  }>;
  associateLoad: ScheduleAlertItem[];
  placements?: Array<{
    associateId: string;
    associateName: string | null;
    day: number;
    shift: 'D' | 'N';
    postId: string;
    postName: string;
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

  getActivePeriod(): Observable<{
    year: number;
    month: number;
    source: 'current' | 'latest_with_data';
  }> {
    return this.http.get<{
      year: number;
      month: number;
      source: 'current' | 'latest_with_data';
    }>(`${this.baseUrl}/active-period`);
  }

  getMonthlyOverview(year: number, month: number): Observable<ProgramacionOverview> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<ProgramacionOverview>(`${this.baseUrl}/overview`, { params });
  }

  findConflicts(year: number, month: number): Observable<ScheduleConflict[]> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<ScheduleConflict[]>(`${this.baseUrl}/conflicts`, { params });
  }

  getAlerts(
    year: number,
    month: number,
    scope: 'auto' | 'current' | 'next' = 'auto',
  ): Observable<MonthlyAlertsResponse> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month))
      .set('scope', scope);
    return this.http.get<MonthlyAlertsResponse>(`${this.baseUrl}/alerts`, { params });
  }

  getBoardAlerts(
    postId: string,
    year: number,
    month: number,
  ): Observable<BoardAlertsResponse> {
    const params = new HttpParams()
      .set('postId', postId)
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<BoardAlertsResponse>(`${this.baseUrl}/alerts/board`, { params });
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
    opts?: {
      roles?: string[];
      tipoCiclo?: '12x3' | '10x5' | '2x2' | '13x2';
      personal?: PersonalRole[];
    },
  ): Observable<MonthlySchedule & { motorAlerts?: unknown[] }> {
    return this.http.post<MonthlySchedule & { motorAlerts?: unknown[] }>(
      `${this.baseUrl}/${id}/motor`,
      opts ?? {},
    );
  }

  getTodayCoverage(date?: string): Observable<TodayCoverageResponse> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<TodayCoverageResponse>(`${this.baseUrl}/today-coverage`, { params });
  }

  getPayrollRecargos(year: number, month: number): Observable<PayrollRecargosResponse> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get<PayrollRecargosResponse>(`${this.baseUrl}/payroll-recargos`, { params });
  }

  downloadPlanillaExcel(year: number, month: number): Observable<Blob> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get(`${this.baseUrl}/planilla/export-excel`, {
      params,
      responseType: 'blob',
    });
  }

  downloadPayrollRecargosExcel(year: number, month: number): Observable<Blob> {
    const params = new HttpParams()
      .set('year', String(year))
      .set('month', String(month));
    return this.http.get(`${this.baseUrl}/payroll-recargos/export-excel`, {
      params,
      responseType: 'blob',
    });
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

  applyRestOfYear(scheduleId: string): Observable<{
    year: number;
    fromMonth: number;
    postId: string;
    applied: Array<{ month: number; scheduleId: string }>;
  }> {
    return this.http.post<{
      year: number;
      fromMonth: number;
      postId: string;
      applied: Array<{ month: number; scheduleId: string }>;
    }>(`${this.baseUrl}/${scheduleId}/apply-rest-of-year`, {});
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

export interface TodayGuardInfo {
  role: string;
  associateId: string | null;
  nombre: string;
  cedula: string;
  telefono: string | null;
  codigo: string | null;
  jornada: Jornada;
  turno: Turno | null;
  inicio: string | null;
  fin: string | null;
  tipo?: string;
}

export interface TodayPostCoverage {
  scheduleId: string;
  status: ScheduleStatus;
  post: {
    id: string;
    code: string;
    name: string;
    address: string | null;
    city: string | null;
  };
  turnoDia: TodayGuardInfo | null;
  turnoNoche: TodayGuardInfo | null;
  otros: TodayGuardInfo[];
  isCovered: boolean;
}

export interface TodayCoverageResponse {
  date: string;
  year: number;
  month: number;
  day: number;
  posts: TodayPostCoverage[];
  summary: {
    totalPosts: number;
    coveredPosts: number;
    uncoveredPosts: number;
    diurnosCount: number;
    nocturnosCount: number;
    descansosCount: number;
    novedadesCount: number;
  };
}

export interface PayrollAssociateRecargo {
  associateId: string;
  nombre: string;
  cedula: string;
  cargo: string;
  puestos: string;
  diasLaborados: number;
  turnosDiurnos: number;
  turnosNocturnos: number;
  descansos: number;
  novedades: number;
  horasOrdinarias: number;
  horasExtrasDiurnas: number;
  recargosNocturnos: number;
  horasExtrasNocturnas: number;
  dominicalesFestivas: number;
  totalHoras: number;
}

export interface PayrollRecargosResponse {
  year: number;
  month: number;
  daysInMonth: number;
  totalAssociates: number;
  totals: {
    horasOrdinarias: number;
    horasExtrasDiurnas: number;
    recargosNocturnos: number;
    horasExtrasNocturnas: number;
    dominicalesFestivas: number;
    totalHorasLiquidables: number;
  };
  associates: PayrollAssociateRecargo[];
}

