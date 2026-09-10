/** Roles de admin maestro: no se les recorta un permiso de otro usuario. */
export function isMasterRole(code?: string | null): boolean {
  return code === 'GERENCIA' || code === 'ADMIN' || code === 'SUPERADMIN';
}
