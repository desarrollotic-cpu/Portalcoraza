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
      for (let d = 1; d <= 30; d++) {
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

async function importMonth(targetMonth, targetYear, baseFolder) {
  console.log(`\n=== IMPORTANDO MES ${targetMonth}/${targetYear} ===`);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const files = [
    { sub: 'zona 04 junio/JUNIO - ZONA 04.xlsx', zone: '04' },
    { sub: 'ZONA 06 JUNIO/JUNIO - ZONA 06.xlsx', zone: '06' },
    { sub: 'ZONA 07 JUNIO/JUNIO  ZONA 07.xlsx', zone: '07' },
    { sub: 'ZONA 09 JUNIO/JUNIO ZONA 09.xlsx', zone: '09' },
    { sub: 'ZONA 12 JUNIO/JUNIO ZONA 12.xlsx', zone: '12' },
    { sub: 'ZONA 13 JUNIO/JUNIO-ZONA 13.xlsx', zone: '13' },
    { sub: 'ZONA 23 JUNIO/JUNIO ZONA 23 - AC.xlsx', zone: '23' }
  ];

  const allRows = [];
  for (const f of files) {
    const fullPath = path.join(baseFolder, f.sub);
    if (fs.existsSync(fullPath)) {
      const r = await parseGenericExcel(fullPath, f.zone);
      console.log(`✓ ${f.sub}: ${r.length} guardias leídos`);
      allRows.push(...r);
    } else {
      console.log(`[!] Archivo no encontrado: ${fullPath}`);
    }
  }

  const postsMap = new Map();
  const existingPosts = await client.query('SELECT id, name, code FROM posts');
  for (const p of existingPosts.rows) {
    if (p.name) postsMap.set(p.name.toUpperCase().trim(), p.id);
  }

  const associatesMap = new Map();
  const existingAssoc = await client.query('SELECT id, document_number FROM associates');
  for (const a of existingAssoc.rows) {
    if (a.document_number) associatesMap.set(a.document_number.trim(), a.id);
  }

  const byPost = new Map();
  for (const row of allRows) {
    const key = row.postName.toUpperCase().trim();
    if (!key) continue;
    const list = byPost.get(key) || [];
    list.push(row);
    byPost.set(key, list);
  }

  console.log(`Total puestos en Junio: ${byPost.size}`);
  let postSeq = 1;
  const allAssignmentsToInsert = [];

  for (const [pName, guards] of byPost.entries()) {
    let postId = postsMap.get(pName);
    if (!postId) {
      const code = `PST_${guards[0]?.zone || '01'}_${postSeq++}_JUN`.toUpperCase();
      const insPost = await client.query(
        `INSERT INTO posts (name, code, zone, status, client_name, type) VALUES ($1, $2, $3, 'ACTIVO', $1, 'SERVICIO_ESPECIAL') RETURNING id`,
        [pName, code, guards[0]?.zone || '01']
      );
      postId = insPost.rows[0].id;
      postsMap.set(pName, postId);
    }

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

    let schedRes = await client.query(
      `SELECT id FROM monthly_schedules WHERE post_id = $1 AND year = $2 AND month = $3 LIMIT 1`,
      [postId, targetYear, targetMonth]
    );
    let schedId = schedRes.rows[0]?.id;

    if (!schedId) {
      const insSched = await client.query(
        `INSERT INTO monthly_schedules (post_id, year, month, status, personal)
         VALUES ($1, $2, $3, 'publicado', $4::jsonb) RETURNING id`,
        [postId, targetYear, targetMonth, JSON.stringify(personalRoles)]
      );
      schedId = insSched.rows[0].id;
    } else {
      await client.query(
        `UPDATE monthly_schedules SET personal = $1::jsonb, status = 'publicado' WHERE id = $2`,
        [JSON.stringify(personalRoles), schedId]
      );
    }

    const daysCount = new Date(targetYear, targetMonth, 0).getDate();
    for (const [cedula, info] of guardRoleMap.entries()) {
      for (let day = 1; day <= daysCount; day++) {
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

  await client.query(`
    DELETE FROM schedule_assignments
    WHERE schedule_id IN (SELECT id FROM monthly_schedules WHERE year = $1 AND month = $2)
  `, [targetYear, targetMonth]);

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

  console.log(`✓✓ Mes ${targetMonth}/${targetYear} importado con ${byPost.size} puestos y ${allAssignmentsToInsert.length} asignaciones.`);
  await client.end();
}

async function run() {
  const base = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD';
  await importMonth(6, 2026, base);
}

run().catch(console.error);
