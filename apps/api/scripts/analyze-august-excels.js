const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

async function analyzeAllFiles() {
  const files = fs.readdirSync(baseFolder);
  for (const f of files) {
    if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;
    const fullPath = path.join(baseFolder, f);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fullPath);
    console.log(`\n======================================================`);
    console.log(`FILE: ${f}`);
    console.log(`======================================================`);
    
    wb.eachSheet((ws) => {
      console.log(`--- Sheet: ${ws.name} (Rows: ${ws.rowCount}, Cols: ${ws.columnCount}) ---`);
      
      // Look for day headers (1..31)
      let dayHeaderRow = -1;
      let dayColMap = {};
      
      for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= ws.columnCount; c++) {
          const val = String(row.getCell(c).value || '').trim();
          if (val === '1' || val === '1S' || val === '1D' || val === '1L' || val === '1M' || val === '1W' || val === '1J' || val === '1V') {
            // Check if next column is 2 or 2D etc
            const nextVal = String(row.getCell(c + 1).value || '').trim();
            if (nextVal.startsWith('2')) {
              dayHeaderRow = r;
              console.log(`  Found Day 1 at Row ${r}, Col ${c} (val: "${val}", next: "${nextVal}")`);
              for (let d = 1; d <= 31; d++) {
                dayColMap[d] = c + d - 1;
              }
              break;
            }
          }
        }
        if (dayHeaderRow !== -1) break;
      }

      // Sample first 5 guard rows after header
      if (dayHeaderRow !== -1) {
        console.log(`  Header row ${dayHeaderRow} columns:`);
        const hRow = ws.getRow(dayHeaderRow);
        for (let c = 1; c <= ws.columnCount; c++) {
          const v = String(hRow.getCell(c).value || '').trim();
          if (v) console.log(`    Col ${c}: "${v}"`);
        }

        console.log(`  Sample 5 data rows after header:`);
        let count = 0;
        for (let r = dayHeaderRow + 1; r <= ws.rowCount && count < 8; r++) {
          const row = ws.getRow(r);
          const rowVals = [];
          for (let c = 1; c <= ws.columnCount; c++) {
            const v = String(row.getCell(c).value || '').trim();
            rowVals.push(v);
          }
          const hasAny = rowVals.some(v => v !== '');
          if (hasAny) {
            console.log(`    Row ${r}:`);
            console.log(`      Non-empty cells 1..10: ${JSON.stringify(rowVals.slice(0, 10).map((v, i) => `[C${i+1}] ${v}`).filter(s => !s.endsWith('""')))}`);
            const daysSample = {};
            for (let d = 1; d <= 10; d++) {
              const col = dayColMap[d];
              if (col) daysSample[d] = rowVals[col - 1] || '';
            }
            console.log(`      Days 1..10: ${JSON.stringify(daysSample)}`);
            count++;
          }
        }
      }
    });
  }
}

analyzeAllFiles().catch(console.error);
