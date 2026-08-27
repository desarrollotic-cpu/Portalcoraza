import * as XLSX from 'xlsx';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

console.log('=== TODAS LAS HOJAS DEL ARCHIVO ===');
wb.SheetNames.forEach((s, idx) => console.log(`${idx + 1}. ${s}`));

// Hojas principales
const mainSheets = ['Matriz', 'SST datos', 'PESV datos', 'DATOS GENERALES', 'FICHA TECNICA'];
wb.SheetNames.forEach(s => {
  if (s.toLowerCase().includes('matriz') || s.toLowerCase().includes('general') || s.toLowerCase().includes('ficha')) {
    console.log(`\n============================`);
    console.log(`HOJA ENCONTRADA: ${s}`);
    console.log(`============================`);
    const ws = wb.Sheets[s];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    rows.slice(0, 40).forEach((r, idx) => {
      const txt = r.filter(c => String(c).trim() !== '').join(' | ');
      if (txt) console.log(`F${idx + 1}: ${txt}`);
    });
  }
});
