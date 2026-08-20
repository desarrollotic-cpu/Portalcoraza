const XLSX = require('xlsx');

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

// Ver la primera hoja completa (el resumen/dashboard principal)
const firstSheet = wb.SheetNames[0];
console.log('=== HOJA PRINCIPAL:', firstSheet, '===');
const ws = wb.Sheets[firstSheet];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

data.forEach((row, i) => {
  if (row.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
    console.log(`Fila ${i + 1}:`, JSON.stringify(row.slice(0, 12)));
  }
});
