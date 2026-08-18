export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: { code: string; name: string };
  permissions: string[];
  warehouseId?: string | null;
  warehouse?: { id: string; code: string; name: string } | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
