/**
 * Render Static Site no reescribe /* → index.html desde el repo.
 * Tras el build, copiamos index.html a las rutas SPA para que
 * /dotacion/panel, /nomina, /contabilidad, /auth/login (etc.) sirvan la app Angular.
 */
const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '..', 'dist', 'web', 'browser');
const indexFile = path.join(browserDir, 'index.html');

if (!fs.existsSync(indexFile)) {
  console.error('[spa-fallback] No existe', indexFile);
  process.exit(1);
}

const routes = [
  'auth',
  'auth/login',
  'dashboard',
  'rrhh',
  'rrhh/panel',
  'rrhh/directorio',
  'rrhh/matriz-sst',
  'rrhh/alertas',
  'rrhh/retiros',
  'rrhh/ausentismo',
  'rrhh/cargos',
  'rrhh/centros-trabajo',
  'dotacion',
  'dotacion/panel',
  'dotacion/asociados',
  'dotacion/inventario',
  'dotacion/inventario/nuevo',
  'dotacion/elementos',
  'nomina',
  'nomina/periodos',
  'nomina/colillas',
  'contabilidad',
  'contabilidad/puc',
  'contabilidad/comprobantes',
  'programacion',
  'programacion/panel',
  'programacion/cuadro',
  'programacion/alertas',
  'programacion/recargos',
  'operaciones',
  'operaciones/puestos',
  'documental',
  'documental/prestamos',
  'recepcion',
  'recepcion/panel',
  'recepcion/registrar',
  'recepcion/dentro',
  'recepcion/historial',
  'sst',
  'sst/panel',
  'sst/inspecciones',
  'sst/inspecciones/nueva',
  'sst/planes',
  'sst/puestos',
  'admin',
  'admin/usuarios',
  'admin/roles',
  'vigilantes',
  'minutas',
  'sig',
  'vigia',
  'vigia/login',
  'solicitud-prestamo',
];

for (const route of routes) {
  const dir = path.join(browserDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(indexFile, path.join(dir, 'index.html'));
  console.log('[spa-fallback]', route + '/index.html');
}

console.log('[spa-fallback] listo');
