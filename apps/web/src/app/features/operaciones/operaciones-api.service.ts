import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PostStatus = 'ACTIVO' | 'INACTIVO';
export type PostType =
  | 'UNIDAD_RESIDENCIAL'
  | 'HOSPITAL'
  | 'UNIVERSIDAD'
  | 'OBRA'
  | 'SERVICIO_ESPECIAL';

export interface OperacionesPost {
  id: string;
  code: string;
  name: string;
  type: PostType;
  status: PostStatus;
  address: string | null;
  clientName: string | null;
  notes: string | null;
  zone: string | null;
  contactName: string | null;
  phone: string | null;
  priority: string | null;
  contractNumber: string | null;
  serviceType: string | null;
  armed: boolean;
  requirements: string | null;
  instructions: string | null;
  workCenterId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOperacionesPostPayload {
  code: string;
  name: string;
  type?: PostType;
  status?: PostStatus;
  address?: string;
  clientName?: string;
  notes?: string;
  zone?: string;
  contactName?: string;
  phone?: string;
  priority?: string;
  contractNumber?: string;
  serviceType?: string;
  armed?: boolean;
  requirements?: string;
  instructions?: string;
}

export type UpdateOperacionesPostPayload = Partial<CreateOperacionesPostPayload>;

export interface OperacionesMinutaRow {
  tipo: string;
  id: string;
  fecha: string;
  estado: string;
  resumen: string;
  registradoPor: string;
  detalles?: Record<string, unknown>;
}

export interface OperacionesMinutaHistorial {
  success: boolean;
  post: { id: string; code: string; name: string };
  month: string;
  total: number;
  historial: OperacionesMinutaRow[];
}

@Injectable({ providedIn: 'root' })
export class OperacionesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/posts`;
  private readonly minutaUrl = `${environment.apiUrl}/minuta`;

  listPosts(): Observable<OperacionesPost[]> {
    return this.http.get<OperacionesPost[]>(this.baseUrl);
  }

  getPost(id: string): Observable<OperacionesPost> {
    return this.http.get<OperacionesPost>(`${this.baseUrl}/${id}`);
  }

  createPost(payload: CreateOperacionesPostPayload): Observable<OperacionesPost> {
    return this.http.post<OperacionesPost>(this.baseUrl, payload);
  }

  updatePost(id: string, payload: UpdateOperacionesPostPayload): Observable<OperacionesPost> {
    return this.http.patch<OperacionesPost>(`${this.baseUrl}/${id}`, payload);
  }

  minutaHistorial(postId: string, month: string): Observable<OperacionesMinutaHistorial> {
    return this.http.get<OperacionesMinutaHistorial>(`${this.minutaUrl}/operaciones/historial`, {
      params: { postId, month },
    });
  }

  downloadMinutaPdf(postId: string, month: string): Observable<Blob> {
    return this.http.get(`${this.minutaUrl}/operaciones/pdf`, {
      params: { postId, month },
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
