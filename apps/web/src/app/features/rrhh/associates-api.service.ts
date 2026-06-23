import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Associate {
  id: string;
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  eps: string | null;
  arl: string | null;
  afp: string | null;
  bank: string | null;
  bloodType: string | null;
  hireDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssociateHistoryItem {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface AssociatePayload {
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  eps?: string;
  arl?: string;
  afp?: string;
  bank?: string;
  bloodType?: string;
  hireDate?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class AssociatesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/associates`;

  list(status?: string): Observable<Associate[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<Associate[]>(`${this.baseUrl}${query}`);
  }

  getById(id: string): Observable<Associate> {
    return this.http.get<Associate>(`${this.baseUrl}/${id}`);
  }

  getHistory(id: string): Observable<AssociateHistoryItem[]> {
    return this.http.get<AssociateHistoryItem[]>(`${this.baseUrl}/${id}/history`);
  }

  create(payload: AssociatePayload): Observable<Associate> {
    return this.http.post<Associate>(this.baseUrl, payload);
  }

  update(id: string, payload: AssociatePayload): Observable<Associate> {
    return this.http.patch<Associate>(`${this.baseUrl}/${id}`, payload);
  }

  retire(id: string): Observable<Associate> {
    return this.http.post<Associate>(`${this.baseUrl}/${id}/retire`, {});
  }
}
