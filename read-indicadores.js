const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';

const wb = XLSX.readFile(filePath);
console.log('=== HOJAS DEL ARCHIVO ===');
console.log(wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n=== HOJA: ${sheetName} ===`);
  // Mostrar las primeras 10 filas
  data.slice(0, 10).forEach((row, i) => {
    if (row.some(cell => cell !== '')) {
      console.log(`Fila ${i + 1}:`, row.slice(0, 8));
    }
  });
});
