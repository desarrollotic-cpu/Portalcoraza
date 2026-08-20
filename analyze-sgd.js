const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('C:/Users/gdocumental/Downloads/APP GESTION DOCUMENTAL/frontend/index.html', 'utf8');
const js = fs.readFileSync('C:/Users/gdocumental/Downloads/APP GESTION DOCUMENTAL/frontend/app.js', 'utf8');
const server = fs.readFileSync('C:/Users/gdocumental/Downloads/APP GESTION DOCUMENTAL/backend/server.js', 'utf8');

console.log('=== SECCIONES EN HTML ===');
const sectionMatches = html.match(/id="([^"]+)"\s+class="section/g) || [];
sectionMatches.forEach(m => console.log(m));

console.log('\n=== MODALES EN HTML ===');
const modalMatches = html.match(/id="(modal[^"]+)"/g) || [];
modalMatches.forEach(m => console.log(m));

console.log('\n=== RUTAS EN SERVER.JS ===');
const routes = server.match(/app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g) || [];
routes.forEach(r => console.log(r));
