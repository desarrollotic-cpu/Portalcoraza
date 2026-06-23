import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  code: string;
  documentTypeId: string;
  documentType?: DocumentType;
  title: string;
  physicalLocation: string | null;
  observations: string | null;
  registeredAt: string;
  fileUrl: string | null;
  storageProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRecordPayload {
  code: string;
  documentTypeId: string;
  title: string;
  physicalLocation?: string;
  observations?: string;
  registeredAt: string;
}

export interface CreateDocumentTypePayload {
  code: string;
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/documental`;

  listTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.baseUrl}/types`);
  }

  createType(payload: CreateDocumentTypePayload): Observable<DocumentType> {
    return this.http.post<DocumentType>(`${this.baseUrl}/types`, payload);
  }

  updateType(id: string, payload: Partial<CreateDocumentTypePayload>): Observable<DocumentType> {
    return this.http.patch<DocumentType>(`${this.baseUrl}/types/${id}`, payload);
  }

  listRecords(code?: string): Observable<DocumentRecord[]> {
    let params = new HttpParams();
    if (code?.trim()) {
      params = params.set('code', code.trim());
    }
    return this.http.get<DocumentRecord[]>(`${this.baseUrl}/records`, { params });
  }

  createRecord(payload: CreateDocumentRecordPayload): Observable<DocumentRecord> {
    return this.http.post<DocumentRecord>(`${this.baseUrl}/records`, payload);
  }

  updateRecord(
    id: string,
    payload: Partial<CreateDocumentRecordPayload>,
  ): Observable<DocumentRecord> {
    return this.http.patch<DocumentRecord>(`${this.baseUrl}/records/${id}`, payload);
  }
}
