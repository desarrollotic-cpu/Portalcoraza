import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InventoryCategory {
  id: string;
  code: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  unit: string;
  lowStockThreshold: number;
  category?: InventoryCategory;
}

export interface InventoryVariant {
  id: string;
  itemId: string;
  sku: string;
  attributes: Record<string, unknown>;
  stockCurrent: number;
  item?: InventoryItem;
}

export interface DeliveryDetail {
  id: string;
  variantId: string;
  quantity: number;
  variant?: InventoryVariant;
}

export interface DeliveryAssociateSnapshot {
  id: string;
  documentNumber: string;
  firstName: string;
  secondName?: string | null;
  firstLastName: string;
  secondLastName?: string | null;
  status?: string;
  jobPosition?: { name: string } | null;
}

export interface DeliverableAssociate {
  id: string;
  documentNumber: string;
  firstName: string;
  secondName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  status: string;
  jobPositionName: string | null;
}

export interface Delivery {
  id: string;
  associateId: string | null;
  postId: string | null;
  status: string;
  signatureUrl: string | null;
  isImmutable: boolean;
  deliveredAt: string | null;
  observations: string | null;
  revertedAt: string | null;
  revertReason: string | null;
  createdAt: string;
  details: DeliveryDetail[];
  associate?: DeliveryAssociateSnapshot | null;
}

export interface StockValidation {
  category: string;
  talla: string | null;
  genero: string | null;
  quantity: number;
  available: number;
  variantId: string | null;
  valid: boolean;
}

export interface CreateItemPayload {
  categoryId: string;
  code: string;
  name: string;
  unit: string;
  lowStockThreshold?: number;
}

export interface UpdateItemPayload {
  categoryId?: string;
  code?: string;
  name?: string;
  unit?: string;
  lowStockThreshold?: number;
}

export interface CreateVariantPayload {
  itemId: string;
  sku: string;
  attributes?: Record<string, unknown>;
}

export interface CreateDeliveryPayload {
  associateId?: string;
  postId?: string;
  observations?: string;
  items: { variantId: string; quantity: number }[];
}

export interface InventoryMovement {
  id: string;
  variantId: string;
  movementType: 'IN' | 'OUT' | 'ADJ';
  quantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  performedByName?: string | null;
  variant?: InventoryVariant;
}

export interface DotacionOverview {
  lowStockCount: number;
  pendingDeliveries: number;
  deliveredToday: number;
  deliveredThisWeek: number;
  totalActiveAssociates: number;
  withoutDotacionCount: number;
  inventoryItemCount: number;
  inventoryVariantCount: number;
  topDeliveredItems: {
    itemName: string;
    sku: string;
    totalQuantity: number;
  }[];
  lowStockItems: {
    sku: string;
    itemName: string;
    stockCurrent: number;
    threshold: number;
  }[];
  recentDeliveries: {
    id: string;
    associateName: string | null;
    status: string;
    itemCount: number;
    date: string;
  }[];
}

export interface WithoutDotacionRow {
  id: string;
  documentNumber: string;
  fullName: string;
  status: string;
  jobPositionName: string | null;
  workCenterCode: string | null;
  lastDeliveryDate: string | null;
  monthsSinceDelivery: number | null;
}

export interface DotacionAssociate {
  id: string;
  documentNumber: string;
  firstName: string;
  secondName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  fullName: string;
  status: string;
  jobPositionName: string | null;
  workCenterCode: string | null;
  workCenterZone: string | null;
  workCenterClient: string | null;
  hireDate: string | null;
}

export interface PaginatedDotacionAssociates {
  items: DotacionAssociate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDeliveries {
  items: Delivery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly http = inject(HttpClient);
  private readonly inventoryUrl = `${environment.apiUrl}/inventory`;
  private readonly deliveriesUrl = `${environment.apiUrl}/deliveries`;

  listCategories(): Observable<InventoryCategory[]> {
    return this.http.get<InventoryCategory[]>(`${this.inventoryUrl}/categories`);
  }

  createCategory(payload: { code: string; name: string }): Observable<InventoryCategory> {
    return this.http.post<InventoryCategory>(`${this.inventoryUrl}/categories`, payload);
  }

  listItems(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.inventoryUrl}/items`);
  }

  createItem(payload: CreateItemPayload): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${this.inventoryUrl}/items`, payload);
  }

  updateItem(id: string, payload: UpdateItemPayload): Observable<InventoryItem> {
    return this.http.patch<InventoryItem>(`${this.inventoryUrl}/items/${id}`, payload);
  }

  listVariants(itemId?: string): Observable<InventoryVariant[]> {
    const query = itemId ? `?itemId=${encodeURIComponent(itemId)}` : '';
    return this.http.get<InventoryVariant[]>(`${this.inventoryUrl}/variants${query}`);
  }

  createVariant(payload: CreateVariantPayload): Observable<InventoryVariant> {
    return this.http.post<InventoryVariant>(`${this.inventoryUrl}/variants`, payload);
  }

  registerMovement(payload: {
    variantId: string;
    movementType: 'IN' | 'OUT' | 'ADJ';
    quantity: number;
    reason?: string;
  }): Observable<unknown> {
    return this.http.post(`${this.inventoryUrl}/movements`, payload);
  }

  listMovements(limit = 150): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(
      `${this.inventoryUrl}/movements?limit=${encodeURIComponent(String(limit))}`,
    );
  }

  availableStock(category: string, talla?: string, genero?: string): Observable<{ quantity: number; variantId: string | null }> {
    const params = new URLSearchParams({ category });
    if (talla) params.set('talla', talla);
    if (genero) params.set('genero', genero);
    return this.http.get<{ quantity: number; variantId: string | null }>(
      `${this.inventoryUrl}/variants/available-stock?${params.toString()}`,
    );
  }

  validateStock(elementos: {
    category: string;
    talla?: string;
    genero?: string;
    quantity: number;
  }[]): Observable<{ valid: boolean; validations: StockValidation[] }> {
    return this.http.post<{ valid: boolean; validations: StockValidation[] }>(
      `${this.inventoryUrl}/validate-stock`,
      { elementos },
    );
  }

  listDeliveries(filters?: { associateId?: string; postId?: string }): Observable<Delivery[]> {
    const params = new URLSearchParams();
    if (filters?.associateId) params.set('associateId', filters.associateId);
    if (filters?.postId) params.set('postId', filters.postId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.http.get<Delivery[]>(`${this.deliveriesUrl}${query}`);
  }

  listDeliveriesPaginated(params?: {
    page?: number;
    limit?: number;
    search?: string;
    associateId?: string;
    postId?: string;
  }): Observable<PaginatedDeliveries> {
    const q = new URLSearchParams();
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 25));
    if (params?.search) q.set('search', params.search);
    if (params?.associateId) q.set('associateId', params.associateId);
    if (params?.postId) q.set('postId', params.postId);
    return this.http.get<PaginatedDeliveries>(`${this.deliveriesUrl}?${q.toString()}`);
  }

  listEligibleAssociates(): Observable<DeliverableAssociate[]> {
    return this.http.get<DeliverableAssociate[]>(`${this.deliveriesUrl}/eligible-associates`);
  }

  createDelivery(payload: CreateDeliveryPayload): Observable<Delivery> {
    return this.http.post<Delivery>(this.deliveriesUrl, payload);
  }

  signDelivery(id: string, signatureData: string): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.deliveriesUrl}/${id}/sign`, { signatureData });
  }

  revertDelivery(id: string, reason: string): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.deliveriesUrl}/${id}/revert`, { reason });
  }

  getDotacionOverview(): Observable<DotacionOverview> {
    return this.http.get<DotacionOverview>(`${this.deliveriesUrl}/overview`);
  }

  listWithoutDotacion(months = 7): Observable<WithoutDotacionRow[]> {
    return this.http.get<WithoutDotacionRow[]>(
      `${this.deliveriesUrl}/without-dotacion?months=${encodeURIComponent(String(months))}`,
    );
  }

  listDotacionAssociates(params?: {
    page?: number;
    limit?: number;
    search?: string;
    workCenterId?: string;
  }): Observable<PaginatedDotacionAssociates> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    if (params?.workCenterId) q.set('workCenterId', params.workCenterId);
    const query = q.toString() ? `?${q.toString()}` : '';
    return this.http.get<PaginatedDotacionAssociates>(`${this.deliveriesUrl}/associates${query}`);
  }

  downloadGeneralReport(): Observable<Blob> {
    return this.http.get(`${this.deliveriesUrl}/reports/general`, { responseType: 'blob' });
  }

  downloadItemReport(itemId: string): Observable<Blob> {
    return this.http.get(`${this.deliveriesUrl}/reports/by-item?itemId=${encodeURIComponent(itemId)}`, {
      responseType: 'blob',
    });
  }

  downloadAssociateReport(associateId: string): Observable<Blob> {
    return this.http.get(
      `${this.deliveriesUrl}/reports/by-associate?associateId=${encodeURIComponent(associateId)}`,
      { responseType: 'blob' },
    );
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  triggerDownload(blob: Blob, filename: string): void {
    this.saveBlob(blob, filename);
  }
}
