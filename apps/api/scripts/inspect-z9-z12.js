const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

async function checkZ9Z12() {
  for (const f of ['ZONA 09 AGOSTO.xlsx', 'ZONA 12 AGOSTO.xlsx']) {
    const full = path.join(baseFolder, f);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(full);
    console.log(`\n=== File: ${f} ===`);
    wb.eachSheet(ws => {
      console.log(`Sheet "${ws.name}" (${ws.rowCount} rows):`);
      for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const vals = [];
        for (let c = 1; c <= 8; c++) {
          const v = String(row.getCell(c).value || '').trim();
          if (v) vals.push(`C${c}: "${v}"`);
        }
        if (vals.length) console.log(`  R${r}: ${vals.join(' | ')}`);
      }
    });
  }
}

checkZ9Z12().catch(console.error);
