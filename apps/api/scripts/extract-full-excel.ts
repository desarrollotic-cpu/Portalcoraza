import * as XLSX from 'xlsx';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

console.log('Total Hojas:', wb.SheetNames.length);
console.log('Lista de Hojas:');
console.log(wb.SheetNames.join(', '));

// Buscar las hojas resumen o matrices
const resumenSheets = wb.SheetNames.filter(s => 
  s.toLowerCase().includes('matriz') || 
  s.toLowerCase().includes('resumen') || 
  s.toLowerCase().includes('consolidado') ||
  s.toLowerCase().includes('datos') ||
  s.toLowerCase().includes('electron') ||
  s.toLowerCase().includes('humana') ||
  s.toLowerCase().includes('cmi') ||
  s.toLowerCase().includes('sig')
);

console.log('\nHojas relevantes encontradas:', resumenSheets);

resumenSheets.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  console.log(`\n========================================`);
  console.log(`HOJA: ${sheetName}`);
  console.log(`========================================`);
  data.slice(0, 20).forEach((row, i) => {
    const filled = row.filter(c => String(c).trim() !== '');
    if (filled.length > 0) {
      console.log(`[Fila ${i + 1}]`, row.slice(0, 8).map(c => String(c).trim()).filter(Boolean).join(' | '));
    }
  });
});
