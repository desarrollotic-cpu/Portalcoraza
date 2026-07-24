/**
 * Render Static Site no reescribe /* → index.html desde el repo.
 * Tras el build, copiamos index.html a las rutas SPA para que
 * /auth/login/ (y similares) sirvan la app Angular.
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
  'dotacion',
  'programacion',
  'documental',
  'recepcion',
  'residential',
  'admin',
];

for (const route of routes) {
  const dir = path.join(browserDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(indexFile, path.join(dir, 'index.html'));
  console.log('[spa-fallback]', route + '/index.html');
}

console.log('[spa-fallback] listo');
