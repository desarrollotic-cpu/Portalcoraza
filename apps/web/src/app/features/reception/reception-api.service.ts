import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ReceptionSex = 'M' | 'F' | 'OTRO' | 'NO_DECLARA';
export type ReceptionTransport =
  | 'MOTO'
  | 'CARRO'
  | 'TRANSPORTE_PUBLICO'
  | 'OTRO'
  | 'NINGUNO';

export interface ReceptionVisitor {
  id: string;
  documentNumber: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
  firstName: string | null;
  secondName: string | null;
  displayName: string;
  sex: ReceptionSex | null;
  birthDate: string | null;
  arl: string | null;
  eps: string | null;
  originPlace: string | null;
  visitReason: string | null;
  entryAt: string;
  authorizedBy: string | null;
  registeredBy: string | null;
  transportMeans: ReceptionTransport | null;
  travelTimeMinutes: number | null;
  exitAt: string | null;
  exitNotes: string | null;
  exitedBy: string | null;
  notes: string | null;
  isAssociate: boolean;
  isInside: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceptionDashboard {
  stats: {
    insideNow: number;
    todayEntries: number;
    todayStillInside: number;
    monthEntries: number;
    yearEntries: number;
    totalEntries: number;
  };
  last14Days: { day: string; entries: number }[];
  insideNow: ReceptionVisitor[];
  today: ReceptionVisitor[];
}

export interface RegisterReceptionVisitorPayload {
  documentNumber?: string;
  firstSurname?: string;
  secondSurname?: string;
  firstName?: string;
  secondName?: string;
  sex?: ReceptionSex;
  birthDate?: string;
  arl?: string;
  eps?: string;
  originPlace?: string;
  visitReason?: string;
  authorizedBy?: string;
  transportMeans?: ReceptionTransport;
  travelTimeMinutes?: number;
  notes?: string;
}

export interface ReceptionVisitorsPage {
  items: ReceptionVisitor[];
  total: number;
  page: number;
  limit: number;
}

export interface ListReceptionVisitorsParams {
  insideOnly?: boolean;
  page?: number;
  limit?: number;
  q?: string;
  status?: 'all' | 'inside' | 'closed';
  period?: 'today' | 'month' | 'year';
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class ReceptionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reception`;

  getDashboard(): Observable<ReceptionDashboard> {
    return this.http.get<ReceptionDashboard>(`${this.baseUrl}/dashboard`);
  }

  listVisitors(params: ListReceptionVisitorsParams = {}): Observable<ReceptionVisitorsPage> {
    const q: Record<string, string> = {};
    if (params.insideOnly) q['insideOnly'] = 'true';
    if (params.page) q['page'] = String(params.page);
    if (params.limit) q['limit'] = String(params.limit);
    if (params.q?.trim()) q['q'] = params.q.trim();
    if (params.status && params.status !== 'all') q['status'] = params.status;
    if (params.period) q['period'] = params.period;
    if (params.from) q['from'] = params.from;
    if (params.to) q['to'] = params.to;
    return this.http.get<ReceptionVisitorsPage>(`${this.baseUrl}/visitors`, { params: q });
  }

  register(payload: RegisterReceptionVisitorPayload): Observable<ReceptionVisitor> {
    return this.http.post<ReceptionVisitor>(`${this.baseUrl}/visitors`, payload);
  }

  lookupAssociate(document: string): Observable<{ isAssociate: boolean; label: string }> {
    return this.http.get<{ isAssociate: boolean; label: string }>(
      `${this.baseUrl}/visitors/lookup-associate`,
      { params: { document } },
    );
  }

  registerExit(id: string, exitNotes?: string): Observable<ReceptionVisitor> {
    return this.http.patch<ReceptionVisitor>(`${this.baseUrl}/visitors/${id}/exit`, {
      exitNotes,
    });
  }

  downloadHistoryPdf(from: string, to: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/reports/history`, {
      params: { from, to },
      responseType: 'blob',
    });
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
