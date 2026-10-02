export interface JwtPayload {
  sub: string;
  email: string;
  roleCode: string;
  permissions: string[];
  /** Organization / tenant del usuario */
  tenantId: string;
  /** Sesión de ronda GPS (vigilante en campo, no es un user de Portal). */
  associateId?: string;
  postId?: string;
}
