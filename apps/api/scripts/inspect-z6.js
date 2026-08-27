const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

async function checkZona06() {
  const z6 = path.join(baseFolder, 'ZONA 06 AGOSTO.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(z6);
  wb.eachSheet(ws => {
    console.log(`Sheet "${ws.name}" (${ws.rowCount} rows):`);
    for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
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

checkZona06().catch(console.error);
