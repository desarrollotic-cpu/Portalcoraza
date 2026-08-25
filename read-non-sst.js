const XLSX = require('xlsx');
const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

// Ver todas las hojas que NO son SST (T1-T23 ni "SST datos")
const sstSheets = new Set(wb.SheetNames.filter(s => s.match(/^T\d+$/) || s === 'SST datos' || s === 'MAPA'));
const otrasHojas = wb.SheetNames.filter(s => !sstSheets.has(s));

console.log('=== TODAS LAS HOJAS ===');
wb.SheetNames.forEach(s => console.log(' -', s));

console.log('\n=== HOJAS NO-SST ===');
otrasHojas.forEach(s => console.log(' -', s));

console.log('\n=== CONTENIDO HOJAS NO-SST ===');
otrasHojas.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n--- HOJA: ${sheetName} ---`);
  data.slice(0, 15).forEach((row, i) => {
    if (row.some(cell => cell !== '')) {
      console.log(`F${i+1}:`, JSON.stringify(row.slice(0, 10)));
    }
  });
});
