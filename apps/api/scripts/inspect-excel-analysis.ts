import * as XLSX from 'xlsx';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

const sampleSheets = ['E1', 'H1', 'C1', 'O1', 'P1', 'S1'];

sampleSheets.forEach(s => {
  if (wb.Sheets[s]) {
    console.log(`\n============================`);
    console.log(`HOJA: ${s}`);
    console.log(`============================`);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[s], { header: 1, defval: '' }) as any[][];
    rows.slice(0, 30).forEach((r, idx) => {
      const line = r.filter(c => String(c).trim() !== '').join(' | ');
      if (line) console.log(`F${idx + 1}: ${line}`);
    });
  }
});
