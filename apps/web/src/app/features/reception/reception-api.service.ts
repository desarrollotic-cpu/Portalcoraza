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

@Injectable({ providedIn: 'root' })
export class ReceptionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reception`;

  getDashboard(): Observable<ReceptionDashboard> {
    return this.http.get<ReceptionDashboard>(`${this.baseUrl}/dashboard`);
  }

  listVisitors(insideOnly = false): Observable<ReceptionVisitor[]> {
    const q = insideOnly ? '?insideOnly=true' : '';
    return this.http.get<ReceptionVisitor[]>(`${this.baseUrl}/visitors${q}`);
  }

  register(payload: RegisterReceptionVisitorPayload): Observable<ReceptionVisitor> {
    return this.http.post<ReceptionVisitor>(`${this.baseUrl}/visitors`, payload);
  }

  registerExit(id: string, exitNotes?: string): Observable<ReceptionVisitor> {
    return this.http.patch<ReceptionVisitor>(`${this.baseUrl}/visitors/${id}/exit`, {
      exitNotes,
    });
  }
}
