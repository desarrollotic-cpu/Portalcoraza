const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

async function inspectEachFile() {
  const files = fs.readdirSync(baseFolder);
  for (const f of files) {
    if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;
    const fullPath = path.join(baseFolder, f);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fullPath);
    console.log(`\n======================================================`);
    console.log(`FILE: ${f}`);
    wb.eachSheet((ws) => {
      console.log(`Sheet "${ws.name}" - ${ws.rowCount} rows`);
      // Print rows where column 1..6 has text that might be post name or header
      for (let r = 1; r <= Math.min(40, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const c1 = String(row.getCell(1).value || '').trim();
        const c2 = String(row.getCell(2).value || '').trim();
        const c3 = String(row.getCell(3).value || '').trim();
        const c4 = String(row.getCell(4).value || '').trim();
        const c5 = String(row.getCell(5).value || '').trim();
        const c6 = String(row.getCell(6).value || '').trim();
        const c7 = String(row.getCell(7).value || '').trim();
        const c8 = String(row.getCell(8).value || '').trim();
        
        if (c1 || c2 || c3 || c4 || c5 || c6 || c7 || c8) {
          console.log(`  R${r}: [1] "${c1}" | [2] "${c2}" | [3] "${c3}" | [4] "${c4}" | [5] "${c5}" | [6] "${c6}" | [7] "${c7}" | [8] "${c8}"`);
        }
      }
    });
  }
}

inspectEachFile().catch(console.error);
