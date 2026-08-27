const dns = require('dns');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const ExcelJS = require('exceljs');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';

function cleanStr(s) {
  if (s === null || s === undefined) return '';
  if (typeof s === 'object' && s.text) return String(s.text).trim();
  if (typeof s === 'object' && s.result) return String(s.result).trim();
  return String(s).trim().replace(/\s+/g, ' ');
}

function cleanCedula(raw) {
  const s = cleanStr(raw).replace(/\D/g, '');
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

// 1. ZONA 04
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
    if (postCol === 'PUESTO' || postCol === 'SERVICIO' || nameCol === 'TURNO DIA' || nameCol === 'TURNO NOCHE' || nameCol === 'AGOSTO') continue;
    if (postCol && postCol.length > 2 && !postCol.includes('TURNO')) currentPost = postCol;
    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(3 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '04', postName: currentPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

// 2. ZONA 06
async function parseZona06(filePath) {
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
    if (postCol && postCol !== 'PUESTO' && postCol !== 'RELEVANTE' && !postCol.includes('Nit.') && !postCol.includes('PROGRAMACIÓN') && postCol.length > 3) {
      currentPost = postCol;
    }
    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(6 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '06', postName: currentPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

// 3. ZONA 09
async function parseZona09(filePath) {
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
    if (postCol && postCol !== 'PUESTO' && postCol !== 'RELEVANTE' && postCol !== 'PENDIENTE' && !postCol.includes('Nit.') && !postCol.includes('PROGRAMACIÓN') && postCol.length > 3) {
      currentPost = postCol;
    }
    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(6 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '09', postName: currentPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

// 4. ZONA 12
async function parseZona12(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  const ws = wb.getWorksheet(1);
  let currentPost = '';
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const postCol = cleanStr(row.getCell(2).value);
    const cedulaRaw = cleanStr(row.getCell(7).value);
    const nameCol = cleanStr(row.getCell(8).value);
    if (postCol && postCol !== 'PUESTO' && postCol !== 'RELEVANTE' && !postCol.includes('Nit.') && !postCol.includes('PROGRAMACIÓN') && postCol.length > 3) {
      currentPost = postCol;
    }
    const cedula = cleanCedula(cedulaRaw);
    if (cedula && currentPost) {
      const days = {};
      // In Zona 12, days 1..31 start at Col 10
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(9 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '12', postName: currentPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

// 5. ZONA 13
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
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(10 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '13', postName: currentPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

// 6. ZONA 20
async function parseZona20(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];
  const ws = wb.getWorksheet(1);
  let currentClient = '';
  let currentPuesto = '';

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 15; c++) {
      const v = cleanStr(row.getCell(c).value);
      if (v.includes('EMPRESA / CLIENTE:') || v.includes('CLIENTE:')) {
        for (let c2 = c + 1; c2 <= ws.columnCount; c2++) {
          const val2 = cleanStr(row.getCell(c2).value);
          if (val2 && val2 !== v && val2.length > 2) { currentClient = val2; break; }
        }
      }
      if (v.includes('PUESTO DE SERVICIO:')) {
        for (let c2 = c + 1; c2 <= ws.columnCount; c2++) {
          const val2 = cleanStr(row.getCell(c2).value);
          if (val2 && val2 !== v && val2.length > 2) { currentPuesto = val2; break; }
        }
      }
    }
    const cedulaRaw = cleanStr(row.getCell(6).value);
    const nameCol = cleanStr(row.getCell(7).value);
    const cedula = cleanCedula(cedulaRaw);
    if (cedula) {
      const finalPost = [currentClient, currentPuesto].filter(Boolean).join(' - ') || 'ZONA 20';
      const days = {};
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(9 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '20', postName: finalPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

// 7. ZONA 23
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
      for (let d = 1; d <= 31; d++) {
        const val = cleanStr(row.getCell(6 + d).value);
        const norm = normalizeCode(val);
        if (norm.codigo) days[d] = norm.codigo;
      }
      rows.push({ zone: '23', postName: currentPost, cedula, guardName: nameCol, days });
    }
  }
  return rows;
}

async function runOfficialImport() {
  console.log('=== INICIANDO CARGA OFICIAL 100% EXACTA DE AGOSTO 2026 ===\n');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const allRecords = [];

  const z4 = path.join(baseFolder, 'ZONA04 AGOSTO.xlsx');
  if (fs.existsSync(z4)) allRecords.push(...(await parseZona04(z4)));

  const z6 = path.join(baseFolder, 'ZONA 06 AGOSTO.xlsx');
  if (fs.existsSync(z6)) allRecords.push(...(await parseZona06(z6)));

  const z7Json = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\scratch\\excel_parsed_zona07.json';
  if (fs.existsSync(z7Json)) {
    const z7Data = JSON.parse(fs.readFileSync(z7Json, 'utf8'));
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
        allRecords.push({ zone: '07', postName: pName, cedula: ced, guardName: cleanStr(g.nombre), days: daysMap });
      }
    }
  }

  const z9 = path.join(baseFolder, 'ZONA 09 AGOSTO.xlsx');
  if (fs.existsSync(z9)) allRecords.push(...(await parseZona09(z9)));

  const z12 = path.join(baseFolder, 'ZONA 12 AGOSTO.xlsx');
  if (fs.existsSync(z12)) allRecords.push(...(await parseZona12(z12)));

  const z13 = path.join(baseFolder, 'ZONA 13 - DE AGOSTO.xlsx');
  if (fs.existsSync(z13)) allRecords.push(...(await parseZona13(z13)));

  const z20 = path.join(baseFolder, 'ZONA 20 AGOSTO.xlsx');
  if (fs.existsSync(z20)) allRecords.push(...(await parseZona20(z20)));

  const z23 = path.join(baseFolder, 'ZONA 23 AGOSTO.xlsx');
  if (fs.existsSync(z23)) allRecords.push(...(await parseZona23(z23)));

  console.log(`Total registros leídos: ${allRecords.length}`);

  // Group records by postName
  const byPost = new Map();
  for (const item of allRecords) {
    const normPost = item.postName.trim().toUpperCase();
    const list = byPost.get(normPost) || [];
    list.push(item);
    byPost.set(normPost, list);
  }
  console.log(`Total puestos a procesar: ${byPost.size}`);

  const assocRes = await client.query('SELECT id, document_number FROM associates');
  const assocMap = new Map();
  for (const a of assocRes.rows) {
    assocMap.set(a.document_number.trim(), a.id);
  }

  const postRes = await client.query('SELECT id, code, name FROM posts');
  const postMap = new Map();
  for (const p of postRes.rows) {
    postMap.set(p.name.trim().toUpperCase(), p.id);
    if (p.code) postMap.set(p.code.trim().toUpperCase(), p.id);
  }

  let createdAssociates = 0;
  let createdPosts = 0;
  let scheduleCount = 0;
  let totalAssignments = 0;

  console.log('Limpiando asignaciones y mallas de Agosto 2026...');
  await client.query(`
    DELETE FROM schedule_assignments 
    WHERE schedule_id IN (SELECT id FROM monthly_schedules WHERE year = 2026 AND month = 8)
  `);
  await client.query(`DELETE FROM monthly_schedules WHERE year = 2026 AND month = 8`);

  const assignmentValues = [];
  const roleKeys = ['titular_a', 'titular_b', 'relevante_1', 'relevante_2', 'relevante_3', 'relevante_4', 'relevante_5', 'relevante_6'];
  const roleLabels = ['Titular A', 'Titular B', 'Relevante 1', 'Relevante 2', 'Relevante 3', 'Relevante 4', 'Relevante 5', 'Relevante 6'];

  const usedPostIds = new Set();

  for (const [postUpperName, guards] of byPost.entries()) {
    let postId = postMap.get(postUpperName);
    if (!postId || usedPostIds.has(postId)) {
      const pZone = guards[0]?.zone || '01';
      const pCode = postUpperName.slice(0, 10).replace(/[^A-Z0-9]/g, '') + '_' + Math.floor(Math.random() * 8999 + 1000);
      const insertPost = await client.query(
        `INSERT INTO posts (code, name, type, zone, status, created_at, updated_at) 
         VALUES ($1, $2, 'UNIDAD_RESIDENCIAL', $3, 'ACTIVO', NOW(), NOW()) RETURNING id`,
        [pCode, guards[0].postName, pZone]
      );
      postId = insertPost.rows[0].id;
      postMap.set(postUpperName, postId);
      createdPosts++;
    }
    usedPostIds.add(postId);

    const personalRoles = [];
    const uniqueGuardsInPost = [];
    const seenCed = new Set();
    for (const g of guards) {
      if (!seenCed.has(g.cedula)) {
        seenCed.add(g.cedula);
        uniqueGuardsInPost.push(g);
      }
    }

    const guardRoleMapping = [];

    for (let i = 0; i < uniqueGuardsInPost.length; i++) {
      const g = uniqueGuardsInPost[i];
      let assocId = assocMap.get(g.cedula);
      if (!assocId) {
        const names = g.guardName.split(' ');
        const fName = names[0] || 'Vigilante';
        const lName = names.slice(1).join(' ') || g.cedula;
        const insAssoc = await client.query(
          `INSERT INTO associates (document_type, document_number, first_name, first_last_name, status, created_at, updated_at)
           VALUES ('CC', $1, $2, $3, 'ACTIVO', NOW(), NOW()) RETURNING id`,
          [g.cedula, fName, lName]
        );
        assocId = insAssoc.rows[0].id;
        assocMap.set(g.cedula, assocId);
        createdAssociates++;
      }

      const rKey = roleKeys[i] || `rol_${i + 1}`;
      const rLabel = roleLabels[i] || `Guardia ${i + 1}`;
      const turnoId = i % 2 === 0 ? 'AM' : 'PM';

      personalRoles.push({
        rol: rKey,
        associateId: assocId,
        turnoId,
        displayName: rLabel
      });

      guardRoleMapping.push({
        guard: g,
        associateId: assocId,
        roleKey: rKey
      });
    }

    const insSched = await client.query(
      `INSERT INTO monthly_schedules (post_id, year, month, status, personal, created_at, updated_at)
       VALUES ($1, 2026, 8, 'publicado', $2::jsonb, NOW(), NOW()) RETURNING id`,
      [postId, JSON.stringify(personalRoles)]
    );
    const scheduleId = insSched.rows[0].id;
    scheduleCount++;

    for (const gInfo of guardRoleMapping) {
      for (let day = 1; day <= 31; day++) {
        const rawCode = gInfo.guard.days[day];
        const norm = normalizeCode(rawCode || '');

        assignmentValues.push([
          scheduleId,
          day,
          gInfo.roleKey,
          gInfo.associateId,
          norm.turno,
          norm.jornada,
          norm.codigo,
          norm.inicio,
          norm.fin
        ]);
        totalAssignments++;
      }
    }
  }

  console.log(`Insertando ${totalAssignments} asignaciones en lotes...`);
  const chunkSize = 200;
  for (let i = 0; i < assignmentValues.length; i += chunkSize) {
    const chunk = assignmentValues.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const params = [];
    let pIdx = 1;

    for (const row of chunk) {
      valuePlaceholders.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7}, $${pIdx+8})`);
      params.push(...row);
      pIdx += 9;
    }

    const query = `
      INSERT INTO schedule_assignments (schedule_id, day, role, associate_id, turno, jornada, codigo, inicio, fin)
      VALUES ${valuePlaceholders.join(', ')}
    `;
    await client.query(query, params);
  }

  console.log('\n========================================================');
  console.log('✓✓✓ CARGA OFICIAL DE AGOSTO 2026 COMPLETADA CON ÉXITO:');
  console.log(`- Total Puestos creados/actualizados con Malla en BD: ${scheduleCount}`);
  console.log(`- Nuevos Puestos creados: ${createdPosts}`);
  console.log(`- Nuevos Asociados creados: ${createdAssociates}`);
  console.log(`- Total Asignaciones de turno día por día insertadas: ${totalAssignments}`);
  console.log('========================================================\n');

  await client.end();
}

runOfficialImport().catch(console.error);
