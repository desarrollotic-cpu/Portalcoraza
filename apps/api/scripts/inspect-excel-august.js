const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

async function inspectExcels() {
  if (!fs.existsSync(baseFolder)) {
    console.log('Folder does not exist:', baseFolder);
    // Let's search Downloads for other locations
    return;
  }

  const files = fs.readdirSync(baseFolder);
  console.log('Found files in folder:', files);

  for (const f of files) {
    if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;
    const fullPath = path.join(baseFolder, f);
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.readFile(fullPath);
      console.log(`\n=== File: ${f} (Sheets: ${wb.worksheets.length}) ===`);
      wb.eachSheet((ws, id) => {
        console.log(`  Sheet [${id}]: "${ws.name}" (Rows: ${ws.rowCount}, Cols: ${ws.columnCount})`);
        // Show first 10 rows
        for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
          const rowVals = [];
          for (let c = 1; c <= Math.min(38, ws.columnCount); c++) {
            const v = ws.getRow(r).getCell(c).value;
            rowVals.push(v !== null && v !== undefined ? String(v).trim() : '');
          }
          if (rowVals.some(v => v !== '')) {
            console.log(`    R${r}: ${JSON.stringify(rowVals.slice(0, 10))} ... days: ${JSON.stringify(rowVals.slice(10, 20))}`);
          }
        }
      });
    } catch (e) {
      console.error(`Error reading ${f}:`, e.message);
    }
  }
}

inspectExcels().catch(console.error);
