import * as XLSX from 'xlsx';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

const cmiWs = wb.Sheets['CMI'];
const cmiRows = XLSX.utils.sheet_to_json(cmiWs, { header: 1, defval: '' }) as any[][];

console.log('=== LINEAS 1 A 37 DE CMI ===');
cmiRows.slice(0, 37).forEach((r, idx) => {
  console.log(`[L${idx + 1}]`, r.filter(c => String(c).trim() !== '').join(' | '));
});
