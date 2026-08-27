import * as XLSX from 'xlsx';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

const cmiWs = wb.Sheets['CMI'];
const cmiRows = XLSX.utils.sheet_to_json(cmiWs, { header: 1, defval: '' }) as any[][];

console.log('=== HOJA CMI COMPLETA ===');
cmiRows.forEach((r, idx) => {
  const line = r.filter(c => String(c).trim() !== '').join(' | ');
  if (line) {
    console.log(`[L${idx + 1}] ${line}`);
  }
});
