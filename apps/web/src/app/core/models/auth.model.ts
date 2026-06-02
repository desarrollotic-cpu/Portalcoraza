export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: { code: string; name: string };
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
