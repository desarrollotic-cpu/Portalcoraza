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
  associateId: string;
  status: string;
  signatureUrl: string | null;
  isImmutable: boolean;
  deliveredAt: string | null;
  createdAt: string;
  details: DeliveryDetail[];
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
  associateId: string;
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

  listDeliveries(associateId?: string): Observable<Delivery[]> {
    const query = associateId ? `?associateId=${encodeURIComponent(associateId)}` : '';
    return this.http.get<Delivery[]>(`${this.deliveriesUrl}${query}`);
  }

  createDelivery(payload: CreateDeliveryPayload): Observable<Delivery> {
    return this.http.post<Delivery>(this.deliveriesUrl, payload);
  }

  signDelivery(id: string, signatureData: string): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.deliveriesUrl}/${id}/sign`, { signatureData });
  }
}
