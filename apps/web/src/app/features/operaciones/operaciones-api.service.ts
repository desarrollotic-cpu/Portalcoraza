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
}

export type UpdateOperacionesPostPayload = Partial<CreateOperacionesPostPayload>;

@Injectable({ providedIn: 'root' })
export class OperacionesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/posts`;

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
}
