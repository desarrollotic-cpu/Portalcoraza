import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import ExcelJS from 'exceljs';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

interface GuardRow {
  postName: string;
  cedula: string;
  guardName: string;
  zone: string;
  days: Record<number, string>;
}

function cleanString(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).trim().replace(/\s+/g, ' ');
}

function normalizeCode(raw: string): { codigo: string | null; jornada: string; turno: string | null; inicio: string | null; fin: string | null } {
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
  // Default to D if contains D, N if contains N
  if (c.startsWith('D')) return { codigo: 'D', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '18:00' };
  if (c.startsWith('N')) return { codigo: 'N', jornada: 'normal', turno: 'PM', inicio: '18:00', fin: '06:00' };
  return { codigo: c, jornada: 'normal', turno: null, inicio: null, fin: null };
}

async function parseGenericExcel(filePath: string, defaultZone: string): Promise<GuardRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const rows: GuardRow[] = [];

  wb.eachSheet((ws) => {
    // Find header row with numbers 1..31
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

    if (headerRowIdx === -1) {
      // Fallback search for PUESTO / CEDULA row
      for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= ws.columnCount; c++) {
          const val = cleanString(row.getCell(c).value).toUpperCase();
          if (val.includes('PUESTO')) postColIdx = c;
          if (val.includes('CEDULA') || val.includes('CÉDULA')) cedulaColIdx = c;
          if (val.includes('NOMBRE') || val.includes('GUARDA')) nameColIdx = c;
        }
        if (postColIdx !== -1) {
          headerRowIdx = r + 1; // days usually on next row
          break;
        }
      }
    }

    // Default column guess if not found
    if (dayColStart === -1) {
      // Look for days in headerRowIdx
      if (headerRowIdx > 0) {
        const row = ws.getRow(headerRowIdx);
        for (let c = 1; c <= ws.columnCount; c++) {
          if (cleanString(row.getCell(c).value) === '1') {
            dayColStart = c;
            break;
          }
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

      // Auto-detect columns from first 8 columns if not set
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

      const guardDays: Record<number, string> = {};
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

async function run() {
  console.log('=== INICIANDO IMPORTACIÓN OFICIAL DE AGOSTO 2026 ===');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('✓ Conectado a base de datos Postgres');

  const baseFolder = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\PROGRAMACION AGOSTO';
  const allRows: GuardRow[] = [];

  // 1. ZONA 04
  const z4 = path.join(baseFolder, 'ZONA04 AGOSTO.xlsx');
  if (fs.existsSync(z4)) {
    console.log('Procesando ZONA 04...');
    const r = await parseGenericExcel(z4, '04');
    console.log(`  ✓ ${r.length} registros en Zona 04`);
    allRows.push(...r);
  }

  // 2. ZONA 06
  const z6 = path.join(baseFolder, 'ZONA 06 AGOSTO.xlsx');
  if (fs.existsSync(z6)) {
    console.log('Procesando ZONA 06...');
    const r = await parseGenericExcel(z6, '06');
    console.log(`  ✓ ${r.length} registros en Zona 06`);
    allRows.push(...r);
  }

  // 3. ZONA 07
  const z7Json = 'C:\\Users\\gdocumental\\Downloads\\CHATBOT\\PROGRAMACION\\APP-CONTABILIDAD\\scratch\\excel_parsed_zona07.json';
  if (fs.existsSync(z7Json)) {
    console.log('Procesando ZONA 07 (JSON)...');
    const z7Data = JSON.parse(fs.readFileSync(z7Json, 'utf8'));
    for (const item of z7Data) {
      const pName = `${item.cliente || ''} ${item.puesto || ''}`.trim() || 'ZONA 07';
      for (const g of (item.guardas || [])) {
        const ced = cleanString(g.cedula).replace(/\D/g, '');
        if (!ced) continue;
        const daysMap: Record<number, string> = {};
        if (g.turnos && Array.isArray(g.turnos)) {
          g.turnos.forEach((t: string, idx: number) => {
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
      }
    }
    console.log('  ✓ Zona 07 procesada');
  }

  // 4. ZONA 09
  const z9 = path.join(baseFolder, 'ZONA 09 AGOSTO.xlsx');
  if (fs.existsSync(z9)) {
    console.log('Procesando ZONA 09...');
    const r = await parseGenericExcel(z9, '09');
    console.log(`  ✓ ${r.length} registros en Zona 09`);
    allRows.push(...r);
  }

  // 5. ZONA 12
  const z12 = path.join(baseFolder, 'ZONA 12 AGOSTO.xlsx');
  if (fs.existsSync(z12)) {
    console.log('Procesando ZONA 12...');
    const r = await parseGenericExcel(z12, '12');
    console.log(`  ✓ ${r.length} registros en Zona 12`);
    allRows.push(...r);
  }

  // 6. ZONA 13
  const z13 = path.join(baseFolder, 'ZONA 13 - DE AGOSTO.xlsx');
  if (fs.existsSync(z13)) {
    console.log('Procesando ZONA 13...');
    const r = await parseGenericExcel(z13, '13');
    console.log(`  ✓ ${r.length} registros en Zona 13`);
    allRows.push(...r);
  }

  // 7. ZONA 20
  const z20 = path.join(baseFolder, 'ZONA 20 AGOSTO.xlsx');
  if (fs.existsSync(z20)) {
    console.log('Procesando ZONA 20...');
    const r = await parseGenericExcel(z20, '20');
    console.log(`  ✓ ${r.length} registros en Zona 20`);
    allRows.push(...r);
  }

  // 8. ZONA 23
  const z23 = path.join(baseFolder, 'ZONA 23 AGOSTO.xlsx');
  if (fs.existsSync(z23)) {
    console.log('Procesando ZONA 23...');
    const r = await parseGenericExcel(z23, '23');
    console.log(`  ✓ ${r.length} registros en Zona 23`);
    allRows.push(...r);
  }

  console.log(`\n→ Total filas consolidables de las 8 Zonas: ${allRows.length}`);

  // Agrupar por puesto
  const byPost = new Map<string, GuardRow[]>();
  for (const row of allRows) {
    const key = row.postName.toUpperCase().trim();
    if (!key) continue;
    const list = byPost.get(key) ?? [];
    list.push(row);
    byPost.set(key, list);
  }

  console.log(`→ Total Puestos únicos detectados: ${byPost.size}`);

  let createdPosts = 0;
  let createdAssociates = 0;
  let insertedAssignments = 0;
  let createdSchedules = 0;

  for (const [pName, guards] of byPost.entries()) {
    // 1. Buscar o crear Puesto
    let postRes = await client.query(`SELECT id FROM posts WHERE UPPER(name) = $1 OR UPPER(code) = $1 LIMIT 1`, [pName]);
    let postId = postRes.rows[0]?.id;

    if (!postId) {
      const code = pName.slice(0, 12).replace(/\s+/g, '_');
      const insPost = await client.query(
        `INSERT INTO posts (name, code, zone, status, client_name) VALUES ($1, $2, $3, 'activo', $1) RETURNING id`,
        [pName, code, guards[0]?.zone || '01']
      );
      postId = insPost.rows[0].id;
      createdPosts++;
    }

    // 2. Procesar Asociados y construir Roles
    const personalRoles: Array<{ rol: string; associateId: string; displayName: string; turnoId: string }> = [];
    const guardRoleMap = new Map<string, { roleKey: string; associateId: string; days: Record<number, string> }>();

    for (let idx = 0; idx < guards.length; idx++) {
      const g = guards[idx];
      let assocRes = await client.query(`SELECT id FROM associates WHERE document_number = $1 LIMIT 1`, [g.cedula]);
      let assocId = assocRes.rows[0]?.id;

      if (!assocId) {
        const parts = g.guardName.split(' ').filter(Boolean);
        const fName = parts[0] || 'Vigilante';
        const lName = parts.slice(1).join(' ') || g.cedula;
        const insAssoc = await client.query(
          `INSERT INTO associates (document_number, first_name, first_last_name, status, cargo)
           VALUES ($1, $2, $3, 'ACTIVO', 'VIGILANTE') RETURNING id`,
          [g.cedula, fName, lName]
        );
        assocId = insAssoc.rows[0].id;
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
      createdSchedules++;
    } else {
      await client.query(
        `UPDATE monthly_schedules SET personal = $1::jsonb, status = 'publicado' WHERE id = $2`,
        [JSON.stringify(personalRoles), schedId]
      );
    }

    // 4. Limpiar asignaciones previas de este puesto en Agosto y reinsertar
    await client.query(`DELETE FROM schedule_assignments WHERE schedule_id = $1`, [schedId]);

    for (const [cedula, info] of guardRoleMap.entries()) {
      for (let day = 1; day <= 31; day++) {
        const rawCode = info.days[day];
        const norm = normalizeCode(rawCode || '');

        await client.query(
          `INSERT INTO schedule_assignments (schedule_id, day, role, associate_id, turno, jornada, codigo, inicio, fin)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            schedId,
            day,
            info.roleKey,
            info.associateId,
            norm.turno,
            norm.jornada,
            norm.codigo,
            norm.inicio,
            norm.fin,
          ]
        );
        insertedAssignments++;
      }
    }
  }

  await client.end();

  console.log('\n========================================');
  console.log('✓✓ IMPORTACIÓN COMPLETADA CON ÉXITO:');
  console.log(`- Puestos registrados/verificados: ${byPost.size} (nuevos creados: ${createdPosts})`);
  console.log(`- Vigilantes/Asociados verificados (nuevos creados: ${createdAssociates})`);
  console.log(`- Mallas mensuales generadas en Agosto 2026: ${createdSchedules}`);
  console.log(`- Asignaciones de turno día por día insertadas: ${insertedAssignments}`);
  console.log('========================================\n');
}

run().catch(console.error);
