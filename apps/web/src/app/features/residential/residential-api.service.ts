import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ReservationApprovalMode = 'manual_approval' | 'auto_approval';
export type PackageStatus = 'RECEIVED' | 'DELIVERED';
export type ReservationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface ResidentialUnit {
  id: string;
  postId: string;
  post?: { id: string; name: string; code?: string };
  block: string | null;
  number: string;
  areaM2: string | null;
  reservationApprovalMode: ReservationApprovalMode;
  createdAt: string;
  updatedAt: string;
}

export interface Resident {
  id: string;
  unitId: string;
  name: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface Visitor {
  id: string;
  unitId: string;
  unit?: ResidentialUnit;
  hostResidentId: string | null;
  hostResident?: Resident | null;
  fullName: string;
  documentNumber: string | null;
  plate: string | null;
  entryTime: string;
  exitTime: string | null;
}

export interface VirtualLogEntry {
  id: string;
  unitId: string;
  entryType: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface Package {
  id: string;
  unitId: string;
  unit?: ResidentialUnit;
  residentId: string | null;
  resident?: Resident | null;
  sender: string | null;
  description: string | null;
  status: PackageStatus;
  receivedAt: string;
  deliveredAt: string | null;
}

export interface Reservation {
  id: string;
  unitId: string;
  unit?: ResidentialUnit;
  resourceCode: string;
  startsAt: string;
  endsAt: string;
  approvalMode: ReservationApprovalMode;
  status: ReservationStatus;
  requestedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitorPayload {
  unitId: string;
  hostResidentId?: string;
  fullName: string;
  documentNumber?: string;
  plate?: string;
  useParking?: boolean;
}

export interface CreatePackagePayload {
  unitId: string;
  residentId?: string;
  sender?: string;
  description?: string;
}

export interface CreateReservationPayload {
  unitId: string;
  resourceCode: string;
  startsAt: string;
  endsAt: string;
}

@Injectable({ providedIn: 'root' })
export class ResidentialApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/residential`;

  listUnits(): Observable<ResidentialUnit[]> {
    return this.http.get<ResidentialUnit[]>(`${this.baseUrl}/units`);
  }

  listResidents(unitId: string): Observable<Resident[]> {
    return this.http.get<Resident[]>(`${this.baseUrl}/units/${unitId}/residents`);
  }

  listActiveVisitors(unitId?: string): Observable<Visitor[]> {
    let params = new HttpParams();
    if (unitId) params = params.set('unitId', unitId);
    return this.http.get<Visitor[]>(`${this.baseUrl}/visitors/active`, { params });
  }

  listVisitorHistory(unitId?: string): Observable<Visitor[]> {
    let params = new HttpParams();
    if (unitId) params = params.set('unitId', unitId);
    return this.http.get<Visitor[]>(`${this.baseUrl}/visitors`, { params });
  }

  registerVisitorEntry(payload: CreateVisitorPayload): Observable<Visitor> {
    return this.http.post<Visitor>(`${this.baseUrl}/visitors/entry`, payload);
  }

  registerVisitorExit(visitorId: string): Observable<Visitor> {
    return this.http.patch<Visitor>(`${this.baseUrl}/visitors/${visitorId}/exit`, {});
  }

  listVirtualLog(unitId: string): Observable<VirtualLogEntry[]> {
    return this.http.get<VirtualLogEntry[]>(`${this.baseUrl}/units/${unitId}/virtual-log`);
  }

  listPackages(unitId?: string, status?: PackageStatus): Observable<Package[]> {
    let params = new HttpParams();
    if (unitId) params = params.set('unitId', unitId);
    if (status) params = params.set('status', status);
    return this.http.get<Package[]>(`${this.baseUrl}/packages`, { params });
  }

  receivePackage(payload: CreatePackagePayload): Observable<Package> {
    return this.http.post<Package>(`${this.baseUrl}/packages`, payload);
  }

  deliverPackage(packageId: string): Observable<Package> {
    return this.http.patch<Package>(`${this.baseUrl}/packages/${packageId}/deliver`, {});
  }

  listReservations(unitId?: string, status?: ReservationStatus): Observable<Reservation[]> {
    let params = new HttpParams();
    if (unitId) params = params.set('unitId', unitId);
    if (status) params = params.set('status', status);
    return this.http.get<Reservation[]>(`${this.baseUrl}/reservations`, { params });
  }

  createReservation(payload: CreateReservationPayload): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.baseUrl}/reservations`, payload);
  }

  updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
  ): Observable<Reservation> {
    return this.http.patch<Reservation>(`${this.baseUrl}/reservations/${reservationId}/status`, {
      status,
    });
  }
}
