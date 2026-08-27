const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

function cleanStr(s) {
  if (s === null || s === undefined) return '';
  if (typeof s === 'object' && s.text) return String(s.text).trim();
  if (typeof s === 'object' && s.result) return String(s.result).trim();
  return String(s).trim().replace(/\s+/g, ' ');
}

function cleanCedula(raw) {
  const s = cleanStr(raw).replace(/\D/g, '');
  if (s.length >= 6 && s.length <= 11) return s;
  return null;
}

function normalizeCode(raw) {
  const c = cleanStr(raw).toUpperCase();
  if (!c || c === '-' || c === '.' || c === '0' || c === '—' || c.length > 8) {
    return { codigo: null, jornada: 'sin_asignar', turno: null, inicio: null, fin: null };
  }
  if (c === 'D' || c === 'D12' || c === 'D-12' || c === '12D' || c === 'DIA' || c === 'D/12') {
    return { codigo: 'D', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '18:00' };
  }
  if (c === 'N' || c === 'N12' || c === 'N-12' || c === '12N' || c === 'NOCHE' || c === 'N/12') {
    return { codigo: 'N', jornada: 'normal', turno: 'PM', inicio: '18:00', fin: '06:00' };
  }
  if (c === 'D8' || c === '8D' || c === 'D-8') {
    return { codigo: 'D8', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '14:00' };
  }
  if (c === 'N8' || c === '8N' || c === 'N-8') {
    return { codigo: 'N8', jornada: 'normal', turno: 'PM', inicio: '22:00', fin: '06:00' };
  }
  if (c === 'DR' || c === 'R' || c === 'DESC' || c === 'DES') {
    return { codigo: 'DR', jornada: 'descanso_remunerado', turno: null, inicio: null, fin: null };
  }
  if (c === 'NR' || c === 'DNR') {
    return { codigo: 'NR', jornada: 'descanso_no_remunerado', turno: null, inicio: null, fin: null };
  }
  if (c === 'VAC' || c === 'VC' || c === 'V') {
    return { codigo: 'VAC', jornada: 'vacacion', turno: null, inicio: null, fin: null };
  }
  if (c === 'LC' || c === 'L') {
    return { codigo: 'LC', jornada: 'licencia', turno: null, inicio: null, fin: null };
  }
  if (c === 'IN' || c === 'INC') {
    return { codigo: 'IN', jornada: 'incapacidad', turno: null, inicio: null, fin: null };
  }
  if (c === 'SP' || c === 'SUS') {
    return { codigo: 'SP', jornada: 'suspension', turno: null, inicio: null, fin: null };
  }
  if (c === 'AC' || c === 'ACC') {
    return { codigo: 'AC', jornada: 'accidente', turno: null, inicio: null, fin: null };
  }
  if (c.startsWith('D')) return { codigo: 'D', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '18:00' };
  if (c.startsWith('N')) return { codigo: 'N', jornada: 'normal', turno: 'PM', inicio: '18:00', fin: '06:00' };
  return { codigo: null, jornada: 'sin_asignar', turno: null, inicio: null, fin: null };
}

async function testParseAugust() {
  const files = fs.readdirSync(baseFolder);
  const allParsed = [];

  for (const f of files) {
    if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;
    const fullPath = path.join(baseFolder, f);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(fullPath);
    
    console.log(`Parsing file: ${f}...`);
    
    wb.eachSheet((ws) => {
      let currentPost = '';
      let dayCols = null; // Map<number, number> day -> colIdx

      for (let r = 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        
        // 1. Check if this row is a header row defining days 1..31
        let foundDay1Col = -1;
        for (let c = 1; c <= ws.columnCount; c++) {
          const val = cleanStr(row.getCell(c).value);
          if (val === '1' || val === '1S' || val === '1D' || val === '1L' || val === '1M' || val === '1W' || val === '1J' || val === '1V') {
            const nextVal = cleanStr(row.getCell(c + 1).value);
            if (nextVal.startsWith('2')) {
              foundDay1Col = c;
              break;
            }
          }
        }

        if (foundDay1Col !== -1) {
          dayCols = {};
          for (let d = 1; d <= 31; d++) {
            dayCols[d] = foundDay1Col + d - 1;
          }
          continue;
        }

        // 2. Check for post headers like "EMPRESA / CLIENTE:" in Zona 20 or banner rows
        for (let c = 1; c <= Math.min(10, ws.columnCount); c++) {
          const v = cleanStr(row.getCell(c).value);
          if (v.includes('EMPRESA / CLIENTE:') || v.includes('CLIENTE:')) {
            // Check adjacent cells for post name
            for (let c2 = c + 1; c2 <= ws.columnCount; c2++) {
              const nameCandidate = cleanStr(row.getCell(c2).value);
              if (nameCandidate && nameCandidate !== v && nameCandidate.length > 2) {
                currentPost = nameCandidate;
                break;
              }
            }
          }
        }

        // 3. Find Cédula and Guard Name in this row
        let cedula = null;
        let guardName = '';
        let rowPost = '';

        for (let c = 1; c <= Math.min(12, ws.columnCount); c++) {
          const cellVal = cleanStr(row.getCell(c).value);
          const maybeCed = cleanCedula(cellVal);
          if (maybeCed && !cedula) {
            cedula = maybeCed;
            // Guard name is usually the next non-empty string column or column 3
            for (let c2 = 1; c2 <= Math.min(12, ws.columnCount); c2++) {
              if (c2 === c) continue;
              const v2 = cleanStr(row.getCell(c2).value);
              if (v2 && !cleanCedula(v2) && v2.length > 3 && isNaN(Number(v2))) {
                // If it's before cedula, might be post name; if after, guard name
                if (c2 > c && !guardName) {
                  guardName = v2;
                } else if (c2 < c && !rowPost && !v2.includes('CUADRANTE') && !v2.includes('PROGRAMACION') && !v2.includes('Nit.')) {
                  rowPost = v2;
                }
              }
            }
          }
        }

        if (cedula && dayCols) {
          if (rowPost) currentPost = rowPost;
          const finalPost = currentPost || rowPost || path.basename(f, '.xlsx');

          const daysMap = {};
          for (let d = 1; d <= 31; d++) {
            const colIdx = dayCols[d];
            if (colIdx) {
              const rawVal = cleanStr(row.getCell(colIdx).value);
              const norm = normalizeCode(rawVal);
              if (norm.codigo) {
                daysMap[d] = norm.codigo;
              }
            }
          }

          allParsed.push({
            file: f,
            postName: finalPost,
            cedula,
            guardName,
            days: daysMap,
            daysCount: Object.keys(daysMap).length
          });
        }
      }
    });
  }

  console.log(`\n========================================`);
  console.log(`TOTAL REGISTROS PARSEADOS CON ÉXITO: ${allParsed.length}`);
  const uniquePosts = new Set(allParsed.map(p => p.postName));
  console.log(`TOTAL PUESTOS ÚNICOS DETECTADOS: ${uniquePosts.size}`);
  
  // Group by post and show sample
  const byPost = {};
  for (const item of allParsed) {
    if (!byPost[item.postName]) byPost[item.postName] = [];
    byPost[item.postName].push(item);
  }

  const samplePosts = Object.keys(byPost).slice(0, 5);
  for (const p of samplePosts) {
    console.log(`\nPuesto: "${p}" (${byPost[p].length} guardas):`);
    for (const g of byPost[p]) {
      console.log(`  - ${g.cedula} (${g.guardName}): ${g.daysCount} turnos asignados -> D1=${g.days[1]||'-'}, D2=${g.days[2]||'-'}, D3=${g.days[3]||'-'}, D15=${g.days[15]||'-'}`);
    }
  }
}

testParseAugust().catch(console.error);
