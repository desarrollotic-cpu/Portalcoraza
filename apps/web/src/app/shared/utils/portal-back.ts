/**
 * Reglas de Atrás del portal (ui-ux-pro-max / Navigation):
 * - Predecible: historial primero, luego padre lógico
 * - No en hojas del menú (secciones elegidas desde el sidebar)
 * - Sí en detalle / nuevo / editar debajo de esas hojas
 */

export function normalizePath(url: string): string {
  const path = (url.split('?')[0] || '/').replace(/\/+$/, '');
  return path === '' ? '/' : path;
}

/** ¿Mostrar Atrás? Solo fuera de hojas del menú / home. */
export function shouldShowPortalBack(url: string, leafRoutes: readonly string[]): boolean {
  const path = normalizePath(url);
  if (
    path === '/' ||
    path === '/dashboard' ||
    path === '/sin-acceso' ||
    path.startsWith('/auth')
  ) {
    return false;
  }

  const leaves = leafRoutes.map(normalizePath);
  if (leaves.includes(path)) {
    return false;
  }

  if (leaves.some((leaf) => path.startsWith(`${leaf}/`))) {
    return true;
  }

  return path.split('/').filter(Boolean).length >= 3;
}

/** Padre lógico para fallback sin historial. */
export function portalBackFallback(url: string, leafRoutes: readonly string[]): string {
  const path = normalizePath(url);
  const leaves = leafRoutes
    .map(normalizePath)
    .filter((leaf) => path.startsWith(`${leaf}/`))
    .sort((a, b) => b.length - a.length);
  if (leaves[0]) {
    return leaves[0];
  }
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 1) {
    parts.pop();
    return '/' + parts.join('/');
  }
  return '/dashboard';
}

export function collectLeafRoutes(
  groups: ReadonlyArray<{
    items: ReadonlyArray<{
      route: string;
      children?: ReadonlyArray<{ route: string }> | null;
    }>;
  }>,
  extras: readonly string[] = [],
): string[] {
  const leaves: string[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.children?.length) {
        for (const child of item.children) {
          leaves.push(normalizePath(child.route));
        }
      } else {
        leaves.push(normalizePath(item.route));
      }
    }
  }
  for (const extra of extras) {
    leaves.push(normalizePath(extra));
  }
  return [...new Set(leaves)];
}

/** Rutas hijas reales que no siempre son hoja explícita en el nav. */
export const PORTAL_BACK_EXTRA_LEAVES = [
  '/dotacion/puestos',
  '/dotacion/entregas',
  '/dotacion/elementos/puestos',
  '/minutas',
  '/minutas/historial',
  '/sst/inspecciones',
] as const;
