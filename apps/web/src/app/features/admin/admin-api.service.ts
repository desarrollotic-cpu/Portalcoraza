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

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName?: string;
  roleId: string;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  fullName?: string | null;
  roleId?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
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

  listPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.baseUrl}/permissions`);
  }

  updateRolePermissions(roleId: string, permissionIds: string[]): Observable<AdminRole> {
    return this.http.put<AdminRole>(`${this.baseUrl}/roles/${roleId}/permissions`, {
      permissionIds,
    });
  }
}
