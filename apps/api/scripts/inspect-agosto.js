const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function run() {
  const folder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';
  if (!fs.existsSync(folder)) {
    console.log('Folder does not exist:', folder);
    return;
  }

  const files = fs.readdirSync(folder).filter(f => f.endsWith('.xlsx'));
  console.log('Found files in Agosto:', files);

  for (const file of files) {
    const fullPath = path.join(folder, file);
    console.log('\n========================================');
    console.log('Inspecting:', file);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fullPath);

    wb.eachSheet((ws, id) => {
      console.log(`- Sheet #${id}: "${ws.name}", rows: ${ws.rowCount}, cols: ${ws.columnCount}`);
      for (let r = 1; r <= Math.min(8, ws.rowCount); r++) {
        const row = ws.getRow(r);
        const vals = [];
        row.eachCell({ includeEmpty: true }, (c, colNum) => {
          if (colNum <= 36) vals.push(String(c.value ?? '').trim());
        });
        if (vals.some(Boolean)) {
          console.log(`  Row ${r}:`, vals.slice(0, 10).join(' | '));
        }
      }
    });
  }
}

run().catch(console.error);
