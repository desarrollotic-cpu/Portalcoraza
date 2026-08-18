import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  warehouseId?: string | null;
  warehouse?: { id: string; code: string; name: string } | null;
  role: { id: string; code: string; name: string };
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rolePermissions: Array<{
    roleId: string;
    permissionId: string;
    permission: { id: string; code: string; name: string; module: string };
  }>;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
}

export interface UsersOverview {
  kpis: {
    usersActive: number;
    usersInactive: number;
    roles: number;
  };
  recentUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    roleName: string;
    isActive: boolean;
    createdAt: string;
  }>;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName?: string;
  roleId: string;
  warehouseId?: string | null;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  fullName?: string | null;
  roleId?: string;
  isActive?: boolean;
  warehouseId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
  }

  getUsersOverview(): Observable<UsersOverview> {
    return this.http.get<UsersOverview>(`${this.baseUrl}/users/overview`);
  }

  createUser(payload: CreateUserPayload): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.baseUrl}/users`, payload);
  }

  updateUser(id: string, payload: UpdateUserPayload): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/users/${id}`, payload);
  }

  deactivateUser(id: string): Observable<AdminUser> {
    return this.http.delete<AdminUser>(`${this.baseUrl}/users/${id}`);
  }

  resetUserPassword(id: string, newPassword: string): Observable<{ ok: boolean; email: string }> {
    return this.http.post<{ ok: boolean; email: string }>(
      `${this.baseUrl}/users/${id}/reset-password`,
      { newPassword },
    );
  }

  listRoles(): Observable<AdminRole[]> {
    return this.http.get<AdminRole[]>(`${this.baseUrl}/roles`);
  }

  listWarehouses(): Observable<Array<{ id: string; code: string; name: string }>> {
    return this.http.get<Array<{ id: string; code: string; name: string }>>(
      `${this.baseUrl}/inventory/warehouses`,
    );
  }

  listPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/permissions`);
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<AdminRole> {
    return this.http.put<AdminRole>(`${this.baseUrl}/roles/${roleId}/permissions`, {
      permissionIds,
    });
  }
}
