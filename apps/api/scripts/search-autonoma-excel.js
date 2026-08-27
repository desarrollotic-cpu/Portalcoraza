const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const base = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD';

function searchExcel(filePath) {
  const wb = new ExcelJS.Workbook();
  return wb.xlsx.readFile(filePath).then(() => {
    const results = [];
    wb.eachSheet((ws) => {
      for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        let rowStr = '';
        row.eachCell((c) => { rowStr += String(c.value || '') + ' | '; });
        if (rowStr.toUpperCase().includes('AUTONOMA') || rowStr.toUpperCase().includes('ECHEVERRI')) {
          results.push(`[${path.basename(filePath)} -> ${ws.name} (R${r})]: ${rowStr.slice(0, 150)}`);
        }
      }
    });
    return results;
  });
}

async function run() {
  const files = [
    'PROGRAMACION AGOSTO\\ZONA 06 AGOSTO.xlsx',
    'PROGRAMACION AGOSTO\\ZONA 09 AGOSTO.xlsx',
    'PROGRAMACION AGOSTO\\ZONA 12 AGOSTO.xlsx',
    'PROGRAMACION AGOSTO\\ZONA 13 - DE AGOSTO.xlsx',
    'PROGRAMACION AGOSTO\\ZONA 20 AGOSTO.xlsx',
    'PROGRAMACION AGOSTO\\ZONA 23 AGOSTO.xlsx',
    'PROGRAMACION AGOSTO\\ZONA04 AGOSTO.xlsx',
    'zona 04 junio\\JUNIO - ZONA 04.xlsx',
    'ZONA 06 JUNIO\\JUNIO - ZONA 06.xlsx',
    'ZONA 07 JUNIO\\JUNIO  ZONA 07.xlsx',
    'ZONA 09 JUNIO\\JUNIO ZONA 09.xlsx',
    'ZONA 12 JUNIO\\JUNIO ZONA 12.xlsx',
    'ZONA 13 JUNIO\\JUNIO-ZONA 13.xlsx',
    'ZONA 23 JUNIO\\JUNIO ZONA 23 - AC.xlsx'
  ];

  for (const rel of files) {
    const full = path.join(base, rel);
    if (fs.existsSync(full)) {
      const res = await searchExcel(full);
      if (res.length) {
        console.log(`\n=== Archivo: ${rel} ===`);
        res.forEach(r => console.log(' ', r));
      }
    }
  }
}

run().catch(console.error);
