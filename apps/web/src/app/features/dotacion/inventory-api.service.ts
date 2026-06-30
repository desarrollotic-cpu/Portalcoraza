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

  createDelivery(payload: CreateDeliveryPayload): Observable<Delivery> {
    return this.http.post<Delivery>(this.deliveriesUrl, payload);
  }

  signDelivery(id: string, signatureData: string): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.deliveriesUrl}/${id}/sign`, { signatureData });
  }

  revertDelivery(id: string, reason: string): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.deliveriesUrl}/${id}/revert`, { reason });
  }
}
