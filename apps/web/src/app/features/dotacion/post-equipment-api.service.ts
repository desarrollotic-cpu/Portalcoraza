import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PostEquipmentStatus = 'ASSIGNED' | 'RETURNED' | 'LOST' | 'WRITTEN_OFF';
export type PostEquipmentUnitStatus = 'AVAILABLE' | 'ASSIGNED' | 'LOST' | 'WRITTEN_OFF';

export interface PostEquipmentCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  color: string | null;
  approximateValue: number | null;
  specs: string | null;
  requiresReturn: boolean;
  isActive: boolean;
  totalUnits: number;
  availableUnits: number;
  assignedUnits: number;
}

export interface PostEquipmentUnit {
  id: string;
  catalogId: string;
  catalogName: string | null;
  catalogCode: string | null;
  unitCode: string;
  label: string | null;
  serialOrTag: string | null;
  status: PostEquipmentUnitStatus;
  currentPostId: string | null;
  currentPostCode: string | null;
  currentPostName: string | null;
  notes: string | null;
}

export interface PostEquipmentLocation {
  unitId: string;
  unitCode: string;
  postId: string | null;
  postCode: string | null;
  postName: string | null;
}

export interface PostEquipmentCatalogDetail {
  catalog: PostEquipmentCatalogItem;
  units: PostEquipmentUnit[];
  summary: { total: number; available: number; assigned: number; lost: number };
  locations: PostEquipmentLocation[];
}

export interface PostEquipmentPostSummary {
  id: string;
  code: string;
  name: string;
  clientName: string | null;
  address: string | null;
  zone: string | null;
  status: string;
  assignedItems: number;
  assignedQty: number;
}

export interface PostEquipmentAssignment {
  id: string;
  postId: string;
  catalogId: string | null;
  catalogName: string | null;
  unitId: string | null;
  unitCode: string | null;
  displayName: string;
  customName: string | null;
  quantity: number;
  serialOrTag: string | null;
  conditionOnDelivery: string | null;
  deliveredAt: string;
  deliveredBy: string | null;
  notes: string | null;
  status: PostEquipmentStatus;
  returnedAt: string | null;
  returnedBy: string | null;
  returnCondition: string | null;
  returnNotes: string | null;
  requiresReturn: boolean;
}

export interface PostEquipmentPostDetail {
  post: {
    id: string;
    code: string;
    name: string;
    clientName: string | null;
    address: string | null;
    status: string;
  };
  units: PostEquipmentUnit[];
  assignments: PostEquipmentAssignment[];
  summary: { assignedItems: number; assignedQty: number };
}

export interface CreateCatalogPayload {
  code: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  category?: string;
  color?: string;
  approximateValue?: number;
  specs?: string;
  requiresReturn?: boolean;
  initialQuantity?: number;
}

export interface CreateUnitsPayload {
  catalogId: string;
  quantity?: number;
  codePrefix?: string;
  unitCodes?: string[];
  notes?: string;
}

export interface CreateAssignmentPayload {
  postId: string;
  unitId?: string;
  catalogId?: string;
  customName?: string;
  quantity?: number;
  serialOrTag?: string;
  conditionOnDelivery?: string;
  notes?: string;
  deliveredAt?: string;
}

export interface BulkAssignPayload {
  postId: string;
  unitIds: string[];
  conditionOnDelivery?: string;
  notes?: string;
}

export interface ReturnAssignmentPayload {
  status?: 'RETURNED' | 'LOST' | 'WRITTEN_OFF';
  returnCondition?: string;
  returnNotes?: string;
}

@Injectable({ providedIn: 'root' })
export class PostEquipmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/post-equipment`;

  listCatalog(): Observable<PostEquipmentCatalogItem[]> {
    return this.http.get<PostEquipmentCatalogItem[]>(`${this.baseUrl}/catalog`);
  }

  createCatalog(payload: CreateCatalogPayload): Observable<PostEquipmentCatalogItem> {
    return this.http.post<PostEquipmentCatalogItem>(`${this.baseUrl}/catalog`, payload);
  }

  getCatalogDetail(id: string): Observable<PostEquipmentCatalogDetail> {
    return this.http.get<PostEquipmentCatalogDetail>(`${this.baseUrl}/catalog/${id}`);
  }

  createUnits(payload: CreateUnitsPayload): Observable<PostEquipmentUnit[]> {
    return this.http.post<PostEquipmentUnit[]>(`${this.baseUrl}/units`, payload);
  }

  listAvailableUnits(catalogId?: string): Observable<PostEquipmentUnit[]> {
    const q = catalogId ? `?catalogId=${catalogId}` : '';
    return this.http.get<PostEquipmentUnit[]>(`${this.baseUrl}/units/available${q}`);
  }

  listPosts(): Observable<PostEquipmentPostSummary[]> {
    return this.http.get<PostEquipmentPostSummary[]>(`${this.baseUrl}/posts`);
  }

  getPostDetail(postId: string): Observable<PostEquipmentPostDetail> {
    return this.http.get<PostEquipmentPostDetail>(`${this.baseUrl}/posts/${postId}`);
  }

  createAssignment(payload: CreateAssignmentPayload): Observable<PostEquipmentAssignment> {
    return this.http.post<PostEquipmentAssignment>(`${this.baseUrl}/assignments`, payload);
  }

  bulkAssign(
    payload: BulkAssignPayload,
  ): Observable<{ assigned: number; assignments: PostEquipmentAssignment[] }> {
    return this.http.post<{ assigned: number; assignments: PostEquipmentAssignment[] }>(
      `${this.baseUrl}/assignments/bulk`,
      payload,
    );
  }

  returnAssignment(
    id: string,
    payload: ReturnAssignmentPayload,
  ): Observable<PostEquipmentAssignment> {
    return this.http.post<PostEquipmentAssignment>(
      `${this.baseUrl}/assignments/${id}/return`,
      payload,
    );
  }
}
