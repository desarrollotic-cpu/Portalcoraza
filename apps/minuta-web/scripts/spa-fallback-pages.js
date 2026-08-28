const fs = require('fs');
const path = require('path');

const browserDir = path.join(__dirname, '..', 'dist', 'minuta-web', 'browser');
const indexFile = path.join(browserDir, 'index.html');

if (!fs.existsSync(indexFile)) {
  console.error('[spa-fallback] No existe', indexFile);
  process.exit(1);
}

const routes = ['login', 'nuevo', 'historial'];

for (const route of routes) {
  const dir = path.join(browserDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(indexFile, path.join(dir, 'index.html'));
  console.log('[spa-fallback]', route + '/index.html');
}

console.log('[spa-fallback] listo');
