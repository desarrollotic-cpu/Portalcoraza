const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

async function checkOtherZones() {
  const otherFiles = [
    'ZONA 06 AGOSTO.xlsx',
    'ZONA 09 AGOSTO.xlsx',
    'ZONA 12 AGOSTO.xlsx',
    'ZONA 13 - DE AGOSTO.xlsx',
    'ZONA 20 AGOSTO.xlsx'
  ];

  for (const f of otherFiles) {
    const fullPath = path.join(baseFolder, f);
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', f);
      continue;
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fullPath);
    console.log(`\n======================================================`);
    console.log(`FILE: ${f}`);
    wb.eachSheet((ws) => {
      console.log(`Sheet "${ws.name}" (${ws.rowCount} rows)`);
      for (let r = 1; r <= Math.min(30, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const vals = [];
        for (let c = 1; c <= 15; c++) {
          const v = String(row.getCell(c).value || '').trim();
          if (v) vals.push(`C${c}: "${v}"`);
        }
        if (vals.length > 0) {
          console.log(`  R${r}: ${vals.join(' | ')}`);
        }
      }
    });
  }
}

checkOtherZones().catch(console.error);
