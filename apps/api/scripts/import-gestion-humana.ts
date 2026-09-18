/**
 * Importa personal + ausentismo desde
 * C:\Users\gdocumental\Downloads\GESTION HUMANA
 *
 * - AUSENTISMO 2026 ACTUAL.xlsx (abierto)
 * - PLANILLA CONTROL DE INGRESO ASOCIADOS V17.xlsx (cifrada: se omite si no hay clave)
 */
import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as XLSX from 'xlsx';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TENANT = '11111111-1111-1111-1111-111111111111';
const ABS_FILE =
  'C:/Users/gdocumental/Downloads/GESTION HUMANA/AUSENTISMO 2026 ACTUAL.xlsx';
const PLANILLA =
  'C:/Users/gdocumental/Downloads/GESTION HUMANA/PLANILLA CONTROL DE INGRESO ASOCIADOS V17.xlsx';

type Person = {
  doc: string;
  firstName: string;
  secondName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  cargo: string | null;
};

function normHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function digits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

function cleanName(v: unknown): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    if (y < 1990 || y > 2035) return null;
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d || d.y < 1990 || d.y > 2035) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  let a = Number(m[1]);
  let b = Number(m[2]);
  let y = Number(m[3].length === 2 ? (Number(m[3]) >= 90 ? `19${m[3]}` : `20${m[3]}`) : m[3]);
  let day: number;
  let month: number;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else if (b > 12 && a <= 12) {
    month = a;
    day = b;
  } else {
    // Ambiguo: Colombia d/m/y
    day = a;
    month = b;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || y < 1990 || y > 2035) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function truthy(v: unknown): boolean {
  const s = String(v ?? '')
    .trim()
    .toUpperCase();
  return ['1', 'SI', 'SÍ', 'TRUE', 'X', 'YES'].includes(s);
}

function mapEvent(raw: unknown): string | null {
  const v = String(raw ?? '')
    .trim()
    .toUpperCase();
  if (!v) return null;
  if (v.includes('S.P') || v.includes('SIN PREST')) return 'S.P.';
  if (v.includes('L.N') || v.includes('NO REMUN')) return 'L.N.R.';
  if (v.includes('L.R') || v.includes('REMUN')) return 'L.R.';
  if (v.includes('ACT') && !v.includes('LLAMADO')) return 'ACT';
  if (v.includes('D.A') || v.includes('VACACION') || v.includes('DESCANSO')) return 'D.A.';
  return 'D.A.';
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const joined = (rows[i] || []).map((c) => normHeader(String(c ?? ''))).join('|');
    if (joined.includes('CEDULA')) return i;
  }
  return 0;
}

function colMap(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((h, i) => {
    const k = normHeader(String(h ?? ''));
    if (k) map.set(k, i);
  });
  return map;
}

function cell(row: unknown[], cols: Map<string, number>, ...names: string[]): unknown {
  for (const n of names) {
    const i = cols.get(normHeader(n));
    if (i != null) return row[i];
  }
  for (const [k, i] of cols) {
    if (names.some((n) => k.includes(normHeader(n)))) return row[i];
  }
  return undefined;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00');
  const b = new Date(end + 'T00:00:00');
  return Math.max(Math.round((b.getTime() - a.getTime()) / 86400000) + 1, 0);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  if (!fs.existsSync(ABS_FILE)) throw new Error(`No existe ${ABS_FILE}`);

  const wb = XLSX.readFile(ABS_FILE, { cellDates: true });
  const people = new Map<string, Person>();
  const diagDesc = new Map<string, string>();

  const codSheet = wb.Sheets['CODIGOS'];
  if (codSheet) {
    const rows = XLSX.utils.sheet_to_json(codSheet, { header: 1, defval: '' }) as unknown[][];
    for (let i = 1; i < rows.length; i++) {
      const code = String(rows[i][0] ?? '')
        .trim()
        .toUpperCase();
      const desc = String(rows[i][1] ?? '').trim();
      if (code && desc) diagDesc.set(code, desc);
    }
  }

  type MedRow = {
    doc: string;
    start: string;
    end: string;
    days: number;
    daysInMonth: number | null;
    ext: boolean;
    exam: boolean;
    origin: string | null;
    cie: string | null;
    cieDesc: string | null;
    eps: string | null;
  };
  type OtrRow = {
    doc: string;
    event: string | null;
    start: string;
    end: string;
    days: number;
    cause: string | null;
    obs: string | null;
    salary: number | null;
    atCosts: number | null;
  };

  const medical: MedRow[] = [];
  const other: OtrRow[] = [];
  const skipped: string[] = [];

  const medSheet = wb.Sheets['REG AUSENTISMO MED'] || wb.Sheets['REG AUSENTISMO MED.'];
  if (medSheet) {
    const rows = XLSX.utils.sheet_to_json(medSheet, { header: 1, defval: '', raw: true }) as unknown[][];
    const headerIdx = findHeaderRow(rows);
    const cols = colMap(rows[headerIdx] || []);
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const doc = digits(cell(row, cols, 'CEDULA'));
      if (!doc) continue;
      const ap1 = cleanName(cell(row, cols, 'APELLIDO 1'));
      const ap2 = cleanName(cell(row, cols, 'APELLIDO 2')) || null;
      const n1 = cleanName(cell(row, cols, 'NOMBRE 1'));
      const n2 = cleanName(cell(row, cols, 'NOMBRE 2')) || null;
      const cargo = cleanName(cell(row, cols, 'CARGO')) || null;
      if (n1 && ap1) {
        people.set(doc, {
          doc,
          firstName: n1,
          secondName: n2,
          firstLastName: ap1,
          secondLastName: ap2,
          cargo,
        });
      }
      let start = parseDate(cell(row, cols, 'FECHA INICIAL DE INCAPACIDAD'));
      let end = parseDate(cell(row, cols, 'FECHA FINAL DE INCAPACIDAD'));
      if (!start || !end) {
        skipped.push(`MED fila ${i + 1} ${doc}: fechas`);
        continue;
      }
      if (end < start) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      const dExcel = num(cell(row, cols, 'DIAS DE INCAPACIDAD', 'DÍAS DE INCAPACIDAD'));
      const dim = num(cell(row, cols, 'DIAS INC DENTRO DEL MES'));
      const cie = String(cell(row, cols, 'CODIGO DIAGNOSTICO', 'CÓDIGO DIAGNOSTICO') ?? '')
        .trim()
        .toUpperCase() || null;
      const cieDesc =
        String(cell(row, cols, 'DESCRIPCION DE LA CATEGORIA', 'DESCRIPCIÓN DE LA CATEGORÍA') ?? '').trim() ||
        null;
      if (cie && cieDesc) diagDesc.set(cie, cieDesc);
      medical.push({
        doc,
        start,
        end,
        days: dExcel && dExcel > 0 ? Math.round(dExcel) : daysBetween(start, end),
        daysInMonth: dim != null ? Math.round(dim) : null,
        ext: truthy(cell(row, cols, 'PRORROGA')),
        exam: truthy(cell(row, cols, 'EXAMEN POST-INCAPACIDAD', 'EXAMEN POST')),
        origin: String(cell(row, cols, 'ORIGEN DE LA INCAPACIDAD') ?? '').trim().toUpperCase() || null,
        cie,
        cieDesc,
        eps: String(cell(row, cols, 'EPS-ARL', 'EPS') ?? '').trim() || null,
      });
    }
  }

  const oSheet = wb.Sheets['OTRO AUSENTISMO'];
  if (oSheet) {
    const rows = XLSX.utils.sheet_to_json(oSheet, { header: 1, defval: '', raw: true }) as unknown[][];
    const headerIdx = findHeaderRow(rows);
    const cols = colMap(rows[headerIdx] || []);
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const doc = digits(cell(row, cols, 'CEDULA'));
      if (!doc) continue;
      const ap1 = cleanName(cell(row, cols, 'APELLIDO 1'));
      const ap2 = cleanName(cell(row, cols, 'APELLIDO 2')) || null;
      const n1 = cleanName(cell(row, cols, 'NOMBRE 1'));
      const n2 = cleanName(cell(row, cols, 'OTROS NOMBRES', 'NOMBRE 2')) || null;
      const cargo = cleanName(cell(row, cols, 'CARGO')) || null;
      if (n1 && ap1) {
        people.set(doc, {
          doc,
          firstName: n1,
          secondName: n2,
          firstLastName: ap1,
          secondLastName: ap2,
          cargo,
        });
      }
      let start = parseDate(cell(row, cols, 'FECHA INI'));
      let end = parseDate(cell(row, cols, 'FECHA FIN'));
      if (!start || !end) {
        skipped.push(`OTRO fila ${i + 1} ${doc}: fechas`);
        continue;
      }
      if (end < start) {
        const tmp = start;
        start = end;
        end = tmp;
      }
      const dExcel = num(cell(row, cols, 'DIAS DE AUSENCIA'));
      other.push({
        doc,
        event: mapEvent(cell(row, cols, 'TIPO DE EVENTO')),
        start,
        end,
        days: dExcel && dExcel > 0 ? Math.round(dExcel) : daysBetween(start, end),
        cause: String(cell(row, cols, 'CAUSA') ?? '').trim() || null,
        obs: String(cell(row, cols, 'OBSERVACIONES') ?? '').trim() || null,
        salary: num(cell(row, cols, 'SALARIO BASE')),
        atCosts: num(cell(row, cols, 'COSTOS ASUMIDOS A.T.')),
      });
    }
  }

  console.log(`Personas únicas: ${people.size}`);
  console.log(`Médico: ${medical.length}  Otro: ${other.length}  omitidas: ${skipped.length}`);
  if (fs.existsSync(PLANILLA)) {
    try {
      XLSX.readFile(PLANILLA);
      console.log('Planilla: abierta (se podrá cruzar más adelante).');
    } catch {
      console.log('Planilla V17 está protegida con contraseña. Se monta el personal desde ausentismo.');
    }
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    const admin = await client.query(
      `SELECT id FROM users WHERE email IN ('admin@coraza.local','admin@corazaseguridadcta.com') ORDER BY email LIMIT 1`,
    );
    const userId: string | null = admin.rows[0]?.id ?? null;

    const cargos = [...new Set([...people.values()].map((p) => p.cargo).filter(Boolean))] as string[];
    for (const name of cargos) {
      const existsPos = await client.query(
        `SELECT id FROM job_positions WHERE tenant_id = $1 AND upper(name) = upper($2) LIMIT 1`,
        [TENANT, name],
      );
      if (!existsPos.rowCount) {
        await client.query(
          `INSERT INTO job_positions (id, tenant_id, name, is_critical, is_active)
           VALUES (gen_random_uuid(), $1, $2, $3, true)`,
          [TENANT, name, name.includes('VIGILANTE') || name.includes('SUPERVISOR')],
        );
      }
    }

    const posRes = await client.query(`SELECT id, upper(name) AS name FROM job_positions`);
    const posByName = new Map(posRes.rows.map((r: { id: string; name: string }) => [r.name, r.id]));

    let created = 0;
    let updated = 0;
    for (const p of people.values()) {
      const jobId = p.cargo ? posByName.get(p.cargo) ?? null : null;
      const exists = await client.query(
        `SELECT id FROM associates WHERE regexp_replace(document_number, '[^0-9]', '', 'g') = $1 LIMIT 1`,
        [p.doc],
      );
      if (exists.rowCount) {
        await client.query(
          `UPDATE associates SET
             first_name = $2,
             second_name = $3,
             first_last_name = $4,
             second_last_name = $5,
             job_position_id = COALESCE($6, job_position_id),
             status = 'ACTIVO',
             updated_at = NOW()
           WHERE id = $1`,
          [exists.rows[0].id, p.firstName, p.secondName, p.firstLastName, p.secondLastName, jobId],
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO associates (
             id, tenant_id, document_type, document_number,
             first_name, second_name, first_last_name, second_last_name,
             birth_date, hire_date, mobile, job_position_id, status
           ) VALUES (
             gen_random_uuid(), $1, 'CC', $2,
             $3, $4, $5, $6,
             '1900-01-01', CURRENT_DATE, '', $7, 'ACTIVO'
           )`,
          [TENANT, p.doc, p.firstName, p.secondName, p.firstLastName, p.secondLastName, jobId],
        );
        created++;
      }
    }
    console.log(`Asociados creados=${created} actualizados=${updated}`);

    const assocRes = await client.query(
      `SELECT id, regexp_replace(document_number, '[^0-9]', '', 'g') AS doc FROM associates`,
    );
    const assocByDoc = new Map(assocRes.rows.map((r: { id: string; doc: string }) => [r.doc, r.id]));

    const usedCodes = new Set(medical.map((m) => m.cie).filter(Boolean) as string[]);
    for (const code of usedCodes) {
      const desc = diagDesc.get(code) || 'Sin descripción (importación GH 2026)';
      await client.query(
        `INSERT INTO diagnosticos_cie10 (id, codigo, descripcion)
         VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (codigo) DO UPDATE SET descripcion = EXCLUDED.descripcion`,
        [code, desc],
      );
    }
    const diagRes = await client.query(`SELECT id, codigo FROM diagnosticos_cie10`);
    const diagByCode = new Map(diagRes.rows.map((r: { id: string; codigo: string }) => [r.codigo, r.id]));

    await client.query('DELETE FROM associate_absences');

    let medOk = 0;
    let othOk = 0;
    let miss = 0;

    const insertAbs = async (row: {
      associateId: string;
      kind: 'MEDICO' | 'OTRO';
      event: string | null;
      start: string;
      end: string;
      days: number;
      daysInMonth: number | null;
      ext: boolean;
      exam: boolean;
      origin: string | null;
      diagnosisId: string | null;
      cause: string | null;
      obs: string | null;
      salary: number | null;
      atCosts: number | null;
    }) => {
      await client.query(
        `INSERT INTO associate_absences (
           id, tenant_id, associate_id, kind, event_type,
           start_date, end_date, absence_days, days_in_month,
           is_extension, post_incapacity_exam, incapacity_origin,
           diagnosis_id, cause, observations, base_salary, at_costs, created_by
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4,
           $5, $6, $7, $8,
           $9, $10, $11,
           $12, $13, $14, $15, $16, $17
         )`,
        [
          TENANT,
          row.associateId,
          row.kind,
          row.event,
          row.start,
          row.end,
          row.days,
          row.daysInMonth,
          row.ext,
          row.exam,
          row.origin,
          row.diagnosisId,
          row.cause,
          row.obs,
          row.salary,
          row.atCosts,
          userId,
        ],
      );
    };

    for (const m of medical) {
      const aid = assocByDoc.get(m.doc);
      if (!aid) {
        miss++;
        continue;
      }
      await insertAbs({
        associateId: aid,
        kind: 'MEDICO',
        event: 'D.A.',
        start: m.start,
        end: m.end,
        days: m.days,
        daysInMonth: m.daysInMonth,
        ext: m.ext,
        exam: m.exam,
        origin: m.origin,
        diagnosisId: m.cie ? diagByCode.get(m.cie) ?? null : null,
        cause: null,
        obs: m.eps ? `EPS/ARL: ${m.eps}` : null,
        salary: null,
        atCosts: null,
      });
      medOk++;
    }

    for (const o of other) {
      const aid = assocByDoc.get(o.doc);
      if (!aid) {
        miss++;
        continue;
      }
      await insertAbs({
        associateId: aid,
        kind: 'OTRO',
        event: o.event,
        start: o.start,
        end: o.end,
        days: o.days,
        daysInMonth: null,
        ext: false,
        exam: false,
        origin: null,
        diagnosisId: null,
        cause: o.cause,
        obs: o.obs,
        salary: o.salary,
        atCosts: o.atCosts,
      });
      othOk++;
    }

    const stats = await client.query(
      `SELECT
         (SELECT count(*) FROM associates WHERE status = 'ACTIVO') AS activos,
         (SELECT count(*) FROM associate_absences WHERE kind = 'MEDICO') AS med,
         (SELECT count(*) FROM associate_absences WHERE kind = 'OTRO') AS otro`,
    );
    console.log('OK médico', medOk, 'otro', othOk, 'sin asociado', miss);
    console.log('BD', stats.rows[0]);
    if (skipped.length) {
      console.log('Fechas omitidas (muestra):', skipped.slice(0, 15).join(' | '));
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
