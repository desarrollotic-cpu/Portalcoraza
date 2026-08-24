export interface JwtPayload {
  sub: string;
  email: string;
  roleCode: string;
  permissions: string[];
  /** Organization / tenant del usuario */
  tenantId: string;
}
