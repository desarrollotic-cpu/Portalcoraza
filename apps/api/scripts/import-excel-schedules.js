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

function cleanString(s) {
  if (s === null || s === undefined) return '';
  return String(s).trim().replace(/\s+/g, ' ');
}

function normalizeCode(raw) {
  const c = cleanString(raw).toUpperCase();
  if (!c || c === '-' || c === '.' || c === '0') {
    return { codigo: null, jornada: 'sin_asignar', turno: null, inicio: null, fin: null };
  }
  if (c === 'D' || c === 'D12' || c === 'D-12' || c === '12D' || c === 'DIA') {
    return { codigo: 'D', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '18:00' };
  }
  if (c === 'N' || c === 'N12' || c === 'N-12' || c === '12N' || c === 'NOCHE') {
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
  return { codigo: c, jornada: 'normal', turno: null, inicio: null, fin: null };
}

async function parseGenericExcel(filePath, defaultZone) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];

  wb.eachSheet((ws) => {
    let headerRowIdx = -1;
    let dayColStart = -1;
    let postColIdx = -1;
    let cedulaColIdx = -1;
    let nameColIdx = -1;

    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= ws.columnCount; c++) {
        const val = cleanString(row.getCell(c).value);
        if (val === '1' && cleanString(row.getCell(c + 1).value) === '2') {
          headerRowIdx = r;
          dayColStart = c;
          break;
        }
      }
      if (headerRowIdx !== -1) break;
    }

    if (dayColStart === -1) {
      for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= ws.columnCount; c++) {
          const val = cleanString(row.getCell(c).value).toUpperCase();
          if (val.includes('PUESTO')) postColIdx = c;
          if (val.includes('CEDULA') || val.includes('CÉDULA')) cedulaColIdx = c;
          if (val.includes('NOMBRE') || val.includes('GUARDA')) nameColIdx = c;
        }
        if (postColIdx !== -1) {
          headerRowIdx = r + 1;
          break;
        }
      }
    }

    if (dayColStart === -1 && headerRowIdx > 0) {
      const row = ws.getRow(headerRowIdx);
      for (let c = 1; c <= ws.columnCount; c++) {
        if (cleanString(row.getCell(c).value) === '1') {
          dayColStart = c;
          break;
        }
      }
    }

    let currentPost = '';
    const startDataRow = (headerRowIdx > 0 ? headerRowIdx + 1 : 8);

    for (let r = startDataRow; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      let pCol = postColIdx > 0 ? cleanString(row.getCell(postColIdx).value) : '';
      let cCol = cedulaColIdx > 0 ? cleanString(row.getCell(cedulaColIdx).value) : '';
      let nCol = nameColIdx > 0 ? cleanString(row.getCell(nameColIdx).value) : '';

      if (!pCol && !cCol && !nCol) {
        const c1 = cleanString(row.getCell(1).value);
        const c2 = cleanString(row.getCell(2).value);
        const c3 = cleanString(row.getCell(3).value);
        const c4 = cleanString(row.getCell(4).value);
        const c5 = cleanString(row.getCell(5).value);
        const c6 = cleanString(row.getCell(6).value);
        const c7 = cleanString(row.getCell(7).value);
        const c8 = cleanString(row.getCell(8).value);

        const items = [c1, c2, c3, c4, c5, c6, c7, c8].filter(Boolean);
        const numItem = items.find(x => /^\d{6,11}$/.test(x));
        if (numItem) {
          cCol = numItem;
          const idx = items.indexOf(numItem);
          if (idx > 0) pCol = items[0];
          if (idx < items.length - 1) nCol = items[idx + 1];
        }
      }

      if (pCol && !pCol.toUpperCase().includes('NIT') && !pCol.toUpperCase().includes('CUADRANTE') && !pCol.toUpperCase().includes('PUESTO')) {
        currentPost = pCol;
      }

      const cedulaClean = cCol.replace(/\D/g, '');
      if (!cedulaClean || cedulaClean.length < 5) continue;

      const guardDays = {};
      const dStart = dayColStart > 0 ? dayColStart : 8;
      for (let d = 1; d <= 31; d++) {
        const cellVal = cleanString(row.getCell(dStart + d - 1).value);
        if (cellVal) guardDays[d] = cellVal;
      }

      if (Object.keys(guardDays).length > 0 || nCol) {
        rows.push({
          postName: currentPost || 'PUESTO ZONA ' + defaultZone,
          cedula: cedulaClean,
          guardName: nCol,
          zone: defaultZone,
          days: guardDays,
        });
      }
    }
  });

  return rows;
}

async function parseZona20Excel(filePath) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows = [];

  wb.eachSheet((ws) => {
    let currentClient = '';
    let currentPost = '';

    for (let r = 8; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const cClient = cleanString(row.getCell(1).value);
      const cPost = cleanString(row.getCell(2).value) || cleanString(row.getCell(5).value);
      const cCedula = cleanString(row.getCell(6).value).replace(/\D/g, '');
      const cName = cleanString(row.getCell(7).value);

      if (cClient && !cClient.toUpperCase().includes('CLIENTE')) currentClient = cClient;
      if (cPost && !cPost.toUpperCase().includes('PUESTO')) currentPost = cPost;

      if (!cCedula || cCedula.length < 5) continue;

      const guardDays = {};
      for (let d = 1; d <= 31; d++) {
        const val = cleanString(row.getCell(9 + d).value); // Col 10 = Day 1
        if (val) guardDays[d] = val;
      }

      const pName = `${currentClient} ${currentPost}`.trim() || currentClient || 'ZONA 20';
      rows.push({
        postName: pName,
        cedula: cCedula,
        guardName: cName,
        zone: '20',
        days: guardDays,
      });
    }
  });

  return rows;
}

async function run() {
  console.log('=== INICIANDO IMPORTACIÓN OFICIAL DE AGOSTO 2026 (8 ZONAS) ===');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('✓ Conectado a base de datos Postgres');

  const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';
  const allRows = [];

  // 1. ZONA 04
  const z4 = path.join(baseFolder, 'ZONA04 AGOSTO.xlsx');
  if (fs.existsSync(z4)) {
    const r = await parseGenericExcel(z4, '04');
    console.log(`✓ Zona 04 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  // 2. ZONA 06
  const z6 = path.join(baseFolder, 'ZONA 06 AGOSTO.xlsx');
  if (fs.existsSync(z6)) {
    const r = await parseGenericExcel(z6, '06');
    console.log(`✓ Zona 06 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  // 3. ZONA 07
  const z7Json = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\scratch\\excel_parsed_zona07.json';
  if (fs.existsSync(z7Json)) {
    const z7Data = JSON.parse(fs.readFileSync(z7Json, 'utf8'));
    let z7Count = 0;
    for (const item of z7Data) {
      const pName = `${item.cliente || ''} ${item.puesto || ''}`.trim() || 'ZONA 07';
      for (const g of (item.guardas || [])) {
        const ced = cleanString(g.cedula).replace(/\D/g, '');
        if (!ced) continue;
        const daysMap = {};
        if (g.turnos && Array.isArray(g.turnos)) {
          g.turnos.forEach((t, idx) => {
            if (t) daysMap[idx + 1] = t;
          });
        }
        allRows.push({
          postName: pName,
          cedula: ced,
          guardName: cleanString(g.nombre),
          zone: '07',
          days: daysMap,
        });
        z7Count++;
      }
    }
    console.log(`✓ Zona 07 leída: ${z7Count} guardias/registros (20 puestos)`);
  }

  // 4. ZONA 09
  const z9 = path.join(baseFolder, 'ZONA 09 AGOSTO.xlsx');
  if (fs.existsSync(z9)) {
    const r = await parseGenericExcel(z9, '09');
    console.log(`✓ Zona 09 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  // 5. ZONA 12
  const z12 = path.join(baseFolder, 'ZONA 12 AGOSTO.xlsx');
  if (fs.existsSync(z12)) {
    const r = await parseGenericExcel(z12, '12');
    console.log(`✓ Zona 12 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  // 6. ZONA 13
  const z13 = path.join(baseFolder, 'ZONA 13 - DE AGOSTO.xlsx');
  if (fs.existsSync(z13)) {
    const r = await parseGenericExcel(z13, '13');
    console.log(`✓ Zona 13 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  // 7. ZONA 20
  const z20 = path.join(baseFolder, 'ZONA 20 AGOSTO.xlsx');
  if (fs.existsSync(z20)) {
    const r = await parseZona20Excel(z20);
    console.log(`✓ Zona 20 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  // 8. ZONA 23
  const z23 = path.join(baseFolder, 'ZONA 23 AGOSTO.xlsx');
  if (fs.existsSync(z23)) {
    const r = await parseGenericExcel(z23, '23');
    console.log(`✓ Zona 23 leída: ${r.length} guardias/registros`);
    allRows.push(...r);
  }

  console.log(`\n→ Total filas consolidables de las 8 Zonas: ${allRows.length}`);

  // 1. Cargar todos los puestos y asociados existentes en caché de memoria
  const postsMap = new Map();
  const existingPosts = await client.query('SELECT id, name, code FROM posts');
  for (const p of existingPosts.rows) {
    if (p.name) postsMap.set(p.name.toUpperCase().trim(), p.id);
    if (p.code) postsMap.set(p.code.toUpperCase().trim(), p.id);
  }

  const associatesMap = new Map();
  const existingAssoc = await client.query('SELECT id, document_number FROM associates');
  for (const a of existingAssoc.rows) {
    if (a.document_number) associatesMap.set(a.document_number.trim(), a.id);
  }

  // Agrupar por puesto
  const byPost = new Map();
  for (const row of allRows) {
    const key = row.postName.toUpperCase().trim();
    if (!key) continue;
    const list = byPost.get(key) || [];
    list.push(row);
    byPost.set(key, list);
  }

  console.log(`→ Total Puestos únicos detectados: ${byPost.size}`);

  let createdPosts = 0;
  let createdAssociates = 0;
  const allAssignmentsToInsert = [];
  let postSeq = 1;

  for (const [pName, guards] of byPost.entries()) {
    // 1. Buscar o crear Puesto
    let postId = postsMap.get(pName);
    if (!postId) {
      const code = `PST_${guards[0]?.zone || '01'}_${postSeq++}_${Date.now().toString(36).slice(-3)}`.toUpperCase();
      const insPost = await client.query(
        `INSERT INTO posts (name, code, zone, status, client_name, type) VALUES ($1, $2, $3, 'ACTIVO', $1, 'SERVICIO_ESPECIAL') RETURNING id`,
        [pName, code, guards[0]?.zone || '01']
      );
      postId = insPost.rows[0].id;
      postsMap.set(pName, postId);
      createdPosts++;
    }

    // 2. Procesar Asociados y construir Roles
    const personalRoles = [];
    const guardRoleMap = new Map();

    for (let idx = 0; idx < guards.length; idx++) {
      const g = guards[idx];
      let assocId = associatesMap.get(g.cedula);

      if (!assocId) {
        const parts = g.guardName.split(' ').filter(Boolean);
        const fName = parts[0] || 'Vigilante';
        const lName = parts.slice(1).join(' ') || g.cedula;
        const insAssoc = await client.query(
          `INSERT INTO associates (document_number, first_name, first_last_name, birth_date, hire_date, mobile, status, document_type)
           VALUES ($1, $2, $3, '1990-01-01', '2022-01-01', '3000000000', 'ACTIVO', 'CC') RETURNING id`,
          [g.cedula, fName, lName]
        );
        assocId = insAssoc.rows[0].id;
        associatesMap.set(g.cedula, assocId);
        createdAssociates++;
      }

      const roleKey = idx === 0 ? 'titular_a' : idx === 1 ? 'titular_b' : `relevante_${idx - 1}`;
      const displayName = idx === 0 ? 'Titular A' : idx === 1 ? 'Titular B' : `Relevante ${idx - 1}`;

      personalRoles.push({
        rol: roleKey,
        associateId: assocId,
        displayName,
        turnoId: idx % 2 === 0 ? 'AM' : 'PM',
      });

      guardRoleMap.set(g.cedula, {
        roleKey,
        associateId: assocId,
        days: g.days,
      });
    }

    // 3. Crear o actualizar MonthlySchedule para Agosto 2026
    let schedRes = await client.query(
      `SELECT id FROM monthly_schedules WHERE post_id = $1 AND year = 2026 AND month = 8 LIMIT 1`,
      [postId]
    );
    let schedId = schedRes.rows[0]?.id;

    if (!schedId) {
      const insSched = await client.query(
        `INSERT INTO monthly_schedules (post_id, year, month, status, personal)
         VALUES ($1, 2026, 8, 'publicado', $2::jsonb) RETURNING id`,
        [postId, JSON.stringify(personalRoles)]
      );
      schedId = insSched.rows[0].id;
    } else {
      await client.query(
        `UPDATE monthly_schedules SET personal = $1::jsonb, status = 'publicado' WHERE id = $2`,
        [JSON.stringify(personalRoles), schedId]
      );
    }

    // 4. Acumular asignaciones
    for (const [cedula, info] of guardRoleMap.entries()) {
      for (let day = 1; day <= 31; day++) {
        const rawCode = info.days[day];
        const norm = normalizeCode(rawCode || '');
        allAssignmentsToInsert.push({
          scheduleId: schedId,
          day,
          role: info.roleKey,
          associateId: info.associateId,
          turno: norm.turno,
          jornada: norm.jornada,
          codigo: norm.codigo,
          inicio: norm.inicio,
          fin: norm.fin,
        });
      }
    }
  }

  // 5. Borrar todas las asignaciones de Agosto 2026 de una sola vez
  console.log('Limpiando asignaciones previas de Agosto 2026...');
  await client.query(`
    DELETE FROM schedule_assignments
    WHERE schedule_id IN (SELECT id FROM monthly_schedules WHERE year = 2026 AND month = 8)
  `);

  // 6. Inserción masiva en bloques de 500 registros
  console.log(`Insertando ${allAssignmentsToInsert.length} asignaciones en bloques...`);
  const chunkSize = 500;
  for (let i = 0; i < allAssignmentsToInsert.length; i += chunkSize) {
    const chunk = allAssignmentsToInsert.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const params = [];

    chunk.forEach((item, idx) => {
      const offset = idx * 9;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);
      params.push(
        item.scheduleId,
        item.day,
        item.role,
        item.associateId,
        item.turno,
        item.jornada,
        item.codigo,
        item.inicio,
        item.fin
      );
    });

    const query = `
      INSERT INTO schedule_assignments (schedule_id, day, role, associate_id, turno, jornada, codigo, inicio, fin)
      VALUES ${valuePlaceholders.join(', ')}
    `;
    await client.query(query, params);
  }

  await client.end();

  console.log('\n======================================================');
  console.log('✓✓✓ IMPORTACIÓN OFICIAL DE AGOSTO 2026 COMPLETADA CON ÉXITO:');
  console.log(`- Puestos registrados/verificados: ${byPost.size} (Nuevos creados: ${createdPosts})`);
  console.log(`- Vigilantes/Asociados registrados (Nuevos: ${createdAssociates})`);
  console.log(`- Cuadros Mensuales oficiales de Agosto 2026: ${byPost.size}`);
  console.log(`- Asignaciones de turno día por día insertadas: ${allAssignmentsToInsert.length}`);
  console.log('======================================================\n');
}

run().catch(console.error);
