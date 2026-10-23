export interface JwtPayload {
  sub: string;
  email: string;
  roleCode: string;
  permissions: string[];
  /** Organization / tenant del usuario */
  tenantId: string;
  /**
   * Sesión de ronda GPS. No es un user del Portal ni identifica a una persona:
   * el celular entra con el nombre de la ronda y su clave.
   */
  rutaId?: string;
  postId?: string;
  /** Obsoleto en rondas: se conserva por sesiones viejas aún vigentes. */
  associateId?: string;
}
