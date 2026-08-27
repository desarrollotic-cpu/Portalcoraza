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
  // Ignore company NIT and short phone prefixes
  if (s === '9004347273' || s === '8110215248' || s === '1241806' || s === '241806' || s.length < 6 || s.length > 11) {
    return null;
  }
  return s;
}

function normalizeCode(raw) {
  const c = cleanStr(raw).toUpperCase().replace(/\s+/g, '');
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

// 1. Parser Zona 04
async function parseZona04(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  const ws = wb.getWorksheet(1);
  
  let currentPost = '';
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const postCol = cleanStr(row.getCell(1).value);
    const cedulaRaw = cleanStr(row.getCell(2).value);
    const nameCol = cleanStr(row.getCell(3).value);
    
    // Ignore header rows
    if (postCol === 'PUESTO' || postCol === 'SERVICIO' || nameCol === 'TURNO DIA' || nameCol === 'TURNO NOCHE' || nameCol === 'AGOSTO') {
      continue;
    }
    
    if (postCol && postCol.length > 2 && !postCol.includes('TURNO')) {
      currentPost = postCol;
    }

    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(3 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({
        zone: '04',
        postName: currentPost,
        cedula,
        guardName: nameCol,
        days
      });
    }
  }
  return rows;
}

// 2. Parser Zona 20
async function parseZona20(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  const ws = wb.getWorksheet(1);

  let currentClient = '';
  let currentPuesto = '';

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    
    // Check for client / puesto headers
    for (let c = 1; c <= 15; c++) {
      const v = cleanStr(row.getCell(c).value);
      if (v.includes('EMPRESA / CLIENTE:') || v.includes('CLIENTE:')) {
        for (let c2 = c + 1; c2 <= ws.columnCount; c2++) {
          const val2 = cleanStr(row.getCell(c2).value);
          if (val2 && val2 !== v && val2.length > 2) {
            currentClient = val2;
            break;
          }
        }
      }
      if (v.includes('PUESTO DE SERVICIO:')) {
        for (let c2 = c + 1; c2 <= ws.columnCount; c2++) {
          const val2 = cleanStr(row.getCell(c2).value);
          if (val2 && val2 !== v && val2.length > 2) {
            currentPuesto = val2;
            break;
          }
        }
      }
    }

    const cedulaRaw = cleanStr(row.getCell(6).value);
    const nameCol = cleanStr(row.getCell(7).value);
    const cedula = cleanCedula(cedulaRaw);

    if (cedula) {
      let finalPost = [currentClient, currentPuesto].filter(Boolean).join(' - ') || 'ZONA 20';
      const days = {};
      // Days 1..31 are at columns 10..40
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(9 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({
        zone: '20',
        postName: finalPost,
        cedula,
        guardName: nameCol,
        days
      });
    }
  }
  return rows;
}

// 3. Parser Zona 23
async function parseZona23(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  const ws = wb.getWorksheet(1);

  let currentPost = '';

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const postCol = cleanStr(row.getCell(3).value);
    const cedulaRaw = cleanStr(row.getCell(4).value);
    const nameCol = cleanStr(row.getCell(5).value);

    if (postCol && postCol !== 'PUESTO' && postCol !== 'RELEVANTE' && !postCol.includes('Nit.') && !postCol.includes('ULTIMA') && !postCol.includes('PROGRAMACIÓN') && postCol.length > 3) {
      currentPost = postCol;
    }

    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      // Days 1..31 are at columns 7..37
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(6 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({
        zone: '23',
        postName: currentPost,
        cedula,
        guardName: nameCol,
        days
      });
    }
  }
  return rows;
}

// 4. Parser Zona 13
async function parseZona13(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  const ws = wb.getWorksheet(1);

  let currentPost = '';

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const postCol = cleanStr(row.getCell(3).value);
    const cedulaRaw = cleanStr(row.getCell(8).value);
    const nameCol = cleanStr(row.getCell(9).value);

    if (postCol && postCol !== 'PUESTO' && postCol !== 'RELEVANTE' && !postCol.includes('CUADRANTE') && !postCol.includes('PROGRAMACIÓN') && postCol.length > 3) {
      currentPost = postCol;
    }

    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      // Days 1..31 are at columns 11..41
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(10 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({
        zone: '13',
        postName: currentPost,
        cedula,
        guardName: nameCol,
        days
      });
    }
  }
  return rows;
}

// 5. Parser Generic for ZONA 06, ZONA 09, ZONA 12
async function parseGenericZone(filePath, zone) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  
  wb.eachSheet((ws) => {
    let dayColStart = -1;
    let postColIdx = 1;
    let cedulaColIdx = 2;
    let nameColIdx = 3;

    for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= ws.columnCount; c++) {
        const v = cleanStr(row.getCell(c).value);
        if (v === '1' || v === '1S' || v === '1D' || v === '1L' || v === '1M' || v === '1W' || v === '1J' || v === '1V') {
          if (cleanStr(row.getCell(c + 1).value).startsWith('2')) {
            dayColStart = c;
            break;
          }
        }
      }
      if (dayColStart !== -1) break;
    }

    if (dayColStart === -1) dayColStart = 4;

    let currentPost = '';

    for (let r = 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      
      // Look for post, cedula, name in columns before dayColStart
      let cedula = null;
      let name = '';
      let postInRow = '';

      for (let c = 1; c < dayColStart; c++) {
        const val = cleanStr(row.getCell(c).value);
        const maybeCed = cleanCedula(val);
        if (maybeCed) {
          cedula = maybeCed;
        } else if (val.length > 3 && isNaN(Number(val)) && !val.includes('AGOSTO') && !val.includes('PROGRAMACION') && !val.includes('CUADRANTE')) {
          if (!name && c >= 2) name = val;
          else if (!postInRow && c < 3) postInRow = val;
        }
      }

      if (postInRow && postInRow !== 'PUESTO' && postInRow !== 'RELEVANTE') {
        currentPost = postInRow;
      }

      if (cedula) {
        const finalPost = currentPost || postInRow || `ZONA ${zone}`;
        const days = {};
        for (let d = 1; d <= 31; d++) {
          const val = cleanStr(row.getCell(dayColStart + d - 1).value);
          const norm = normalizeCode(val);
          if (norm.codigo) days[d] = norm.codigo;
        }
        rows.push({
          zone,
          postName: finalPost,
          cedula,
          guardName: name,
          days
        });
      }
    }
  });

  return rows;
}

async function runMasterTest() {
  console.log('=== TESTEANDO PARSER MAESTRO OFICIAL DE AGOSTO ===\n');
  const all = [];

  // Zona 04
  const z4 = path.join(baseFolder, 'ZONA04 AGOSTO.xlsx');
  if (fs.existsSync(z4)) {
    const r = await parseZona04(z4);
    console.log(`✓ Zona 04: ${r.length} guardias procesados`);
    all.push(...r);
  }

  // Zona 06
  const z6 = path.join(baseFolder, 'ZONA 06 AGOSTO.xlsx');
  if (fs.existsSync(z6)) {
    const r = await parseGenericZone(z6, '06');
    console.log(`✓ Zona 06: ${r.length} guardias procesados`);
    all.push(...r);
  }

  // Zona 07
  const z7Json = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\scratch\\excel_parsed_zona07.json';
  if (fs.existsSync(z7Json)) {
    const z7Data = JSON.parse(fs.readFileSync(z7Json, 'utf8'));
    let count = 0;
    for (const item of z7Data) {
      const pName = `${item.cliente || ''} ${item.puesto || ''}`.trim() || 'ZONA 07';
      for (const g of (item.guardas || [])) {
        const ced = cleanCedula(g.cedula);
        if (!ced) continue;
        const daysMap = {};
        if (g.turnos && Array.isArray(g.turnos)) {
          g.turnos.forEach((t, idx) => {
            const norm = normalizeCode(t);
            if (norm.codigo) daysMap[idx + 1] = norm.codigo;
          });
        }
        all.push({
          zone: '07',
          postName: pName,
          cedula: ced,
          guardName: cleanStr(g.nombre),
          days: daysMap
        });
        count++;
      }
    }
    console.log(`✓ Zona 07: ${count} guardias procesados`);
  }

  // Zona 09
  const z9 = path.join(baseFolder, 'ZONA 09 AGOSTO.xlsx');
  if (fs.existsSync(z9)) {
    const r = await parseGenericZone(z9, '09');
    console.log(`✓ Zona 09: ${r.length} guardias procesados`);
    all.push(...r);
  }

  // Zona 12
  const z12 = path.join(baseFolder, 'ZONA 12 AGOSTO.xlsx');
  if (fs.existsSync(z12)) {
    const r = await parseGenericZone(z12, '12');
    console.log(`✓ Zona 12: ${r.length} guardias procesados`);
    all.push(...r);
  }

  // Zona 13
  const z13 = path.join(baseFolder, 'ZONA 13 - DE AGOSTO.xlsx');
  if (fs.existsSync(z13)) {
    const r = await parseZona13(z13);
    console.log(`✓ Zona 13: ${r.length} guardias procesados`);
    all.push(...r);
  }

  // Zona 20
  const z20 = path.join(baseFolder, 'ZONA 20 AGOSTO.xlsx');
  if (fs.existsSync(z20)) {
    const r = await parseZona20(z20);
    console.log(`✓ Zona 20: ${r.length} guardias procesados`);
    all.push(...r);
  }

  // Zona 23
  const z23 = path.join(baseFolder, 'ZONA 23 AGOSTO.xlsx');
  if (fs.existsSync(z23)) {
    const r = await parseZona23(z23);
    console.log(`✓ Zona 23: ${r.length} guardias procesados`);
    all.push(...r);
  }

  console.log(`\n==============================================`);
  console.log(`TOTAL REGISTROS VALIDADOS: ${all.length}`);
  const postsMap = new Map();
  for (const item of all) {
    const list = postsMap.get(item.postName) || [];
    list.push(item);
    postsMap.set(item.postName, list);
  }
  console.log(`TOTAL PUESTOS IDENTIFICADOS: ${postsMap.size}`);
  console.log(`==============================================\n`);

  // Show sample of 10 posts
  const sample = Array.from(postsMap.entries()).slice(0, 10);
  for (const [post, guards] of sample) {
    console.log(`\n🏢 PUESTO: "${post}" (${guards.length} vigilantes):`);
    for (const g of guards) {
      const activeDays = Object.keys(g.days).length;
      console.log(`  - [CC ${g.cedula}] ${g.guardName} (${activeDays} días con turno): D1=${g.days[1]||'-'}, D2=${g.days[2]||'-'}, D3=${g.days[3]||'-'}, D4=${g.days[4]||'-'}, D15=${g.days[15]||'-'}, D31=${g.days[31]||'-'}`);
    }
  }
}

runMasterTest().catch(console.error);
