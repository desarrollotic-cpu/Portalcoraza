/**
 * Self-check sin Angular. En Node 22+: 
 *   node --experimental-strip-types apps/web/src/app/shared/utils/portal-back.check.ts
 */
import {
  normalizePath,
  portalBackFallback,
  shouldShowPortalBack,
} from './portal-back';

const LEAVES = [
  '/dashboard',
  '/rrhh',
  '/rrhh/asociados',
  '/rrhh/retiros',
  '/operaciones',
  '/operaciones/puestos',
  '/dotacion/inventario',
  '/sst/inspecciones/nueva',
  '/sst/inspecciones',
];

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(normalizePath('/rrhh/asociados/') === '/rrhh/asociados', 'normalize');
assert(shouldShowPortalBack('/dashboard', LEAVES) === false, 'dashboard');
assert(shouldShowPortalBack('/rrhh/asociados', LEAVES) === false, 'list leaf');
assert(shouldShowPortalBack('/rrhh/asociados/abc', LEAVES) === true, 'detail');
assert(shouldShowPortalBack('/rrhh/asociados/abc/editar', LEAVES) === true, 'edit');
assert(shouldShowPortalBack('/rrhh/asociados/nuevo', LEAVES) === true, 'nuevo');
assert(shouldShowPortalBack('/dotacion/inventario/nuevo', LEAVES) === true, 'inv nuevo');
assert(shouldShowPortalBack('/sst/inspecciones/nueva', LEAVES) === false, 'nueva IPT leaf');
assert(shouldShowPortalBack('/sst/inspecciones/xyz', LEAVES) === true, 'IPT detail');
assert(shouldShowPortalBack('/operaciones/puestos', LEAVES) === false, 'puestos list');
assert(
  portalBackFallback('/rrhh/asociados/abc', LEAVES) === '/rrhh/asociados',
  'fallback',
);

console.log('portal-back.check: ok');
