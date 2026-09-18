/**
 * Delta RRHH: alta Fabián Mercado + 10 retiros de la planilla.
 * No modifica folder_number de fichas existentes. No toca Documental.
 */
import * as dns from 'dns';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as XLSX from 'xlsx';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TENANT = '11111111-1111-1111-1111-111111111111';
const FILE = 'C:/Users/gdocumental/Downloads/RRHH/_open/V17.xlsx';
const ALTA = '1068807443';
const RETIROS = [
  '1007460505',
  '71190668',
  '1020466554',
  '1036676172',
  '8407241',
  '1000657770',
  '1038769843',
  '4339461',
  '1038404726',
  '70108742',
];

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}
function txt(v: unknown): string {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}
function blankToNull(v: string): string | null {
  const s = txt(v);
  if (!s || ['NO INFORMA', 'N/A', '-', 'NULL'].includes(s.toUpperCase())) return null;
  return s;
}
function digits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}
function money(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/[$\s]/g, '').replace(/\./g, '').replace(/,/g, '.'));
  return Number.isFinite(n) && n !== 0 ? n : null;
}
function intOrNull(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function parseDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    if (y < 1940 || y > 2035) return null;
    return `${y}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d || d.y < 1940 || d.y > 2035) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3].length === 2 ? (Number(m[3]) >= 40 ? `19${m[3]}` : `20${m[3]}`) : m[3]);
  const day = a > 12 && b <= 12 ? a : b > 12 && a <= 12 ? b : a;
  const month = a > 12 && b <= 12 ? b : b > 12 && a <= 12 ? a : b;
  if (month < 1 || month > 12 || day < 1 || day > 31 || y < 1940 || y > 2035) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function mapDocType(v: string): string {
  const t = norm(v);
  if (t.includes('CE')) return 'CE';
  if (t.includes('PA')) return 'PA';
  if (t.includes('PEP')) return 'PEP';
  return 'CC';
}
function mapSex(v: string): string | null {
  const t = norm(v);
  if (t.startsWith('M')) return 'MASCULINO';
  if (t.startsWith('F')) return 'FEMENINO';
  return null;
}
function mapMarital(v: string): string | null {
  const t = norm(v);
  if (t.includes('UNION')) return 'UNION_LIBRE';
  if (t.includes('CASAD')) return 'CASADO';
  if (t.includes('SOLTER')) return 'SOLTERO';
  if (t.includes('DIVOR')) return 'DIVORCIADO';
  if (t.includes('VIUD')) return 'VIUDO';
  return null;
}
function truthy(v: unknown): boolean {
  const s = norm(String(v ?? ''));
  return s === 'SI' || s === '1' || s === 'TRUE' || s === 'X';
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');

  const wb = XLSX.readFile(FILE, { cellDates: true });
  const sheetName = wb.SheetNames.find((s) => norm(s).includes('INGRESO'));
  if (!sheetName) throw new Error('No está la hoja INGRESOS');
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: true }) as unknown[][];
  let headerIdx = 0;
  for (let i = 0; i < 8; i++) {
    const joined = (rows[i] || []).map((c) => norm(String(c ?? ''))).join('|');
    if (joined.includes('IDENTIFICACION') && joined.includes('PRIMER APELLIDO')) {
      headerIdx = i;
      break;
    }
  }
  const headers = (rows[headerIdx] || []).map((c) => norm(String(c ?? '')));
  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h === norm(n) || h.includes(norm(n)));
      if (i >= 0) return i;
    }
    return -1;
  };
  const C = {
    folder: idx('CARPETA ACTUAL', 'N CARPETA'),
    acta: idx('ACTA'),
    tipo: idx('TIPO DOC'),
    doc: idx('N. IDENTIFICACION', 'IDENTIFICACION'),
    ap1: idx('PRIMER APELLIDO'),
    ap2: idx('SEGUNDO APELLIDO'),
    n1: idx('PRIMER NOMBRE'),
    n2: idx('SEGUNDO NOMBRE'),
    centro: idx('CENTRO DE TRABAJO'),
    nac: idx('FECHA NACIMIENTO'),
    exp: idx('FECHA EXPEDICION'),
    email: idx('CORREO'),
    dir: idx('DIRECCION'),
    cel: idx('CELULAR'),
    emerg: idx('CONTACTO DE EMERGENCIA'),
    parent: idx('PARENTESCO'),
    ingreso: idx('FECHA INGRESO'),
    cargo: idx('LABOR REALIZADA'),
    critico: idx('CARGO CRITICO'),
    psico: idx('PSICOFISICO'),
    senso: idx('PSICOSENSOMETRICO'),
    ord: idx('COMPENSACION ORDINARIA'),
    prom: idx('PROMEDIO SALARIAL'),
    eps: idx('EPS'),
    fondo: idx('FONDO DE PENSION'),
    funer: idx('FUNERARIA'),
    sura: idx('POLIZA SURA'),
    cuenta: idx('CUENTA DAVIVIENDA', 'CUENTA'),
    curso: idx('CODIGO DEL CURSO'),
    nit: idx('NIT ESCUELA'),
    nro: idx('NUMERO (NRO)'),
    rh: idx('RH'),
    sexo: idx('SEXO AL NACER'),
    genero: idx('GENERO'),
    ori: idx('ORIENTACION SEXUAL'),
    relig: idx('RELIG'),
    civil: idx('ESTADO CIVIL'),
    hijos: idx('HIJOS'),
    cargoPers: idx('PERSONAS A CARGO'),
    viv: idx('TIPO DE VIVIENDA'),
    estrato: idx('ESTRATO'),
    estudio: idx('NIVEL DE ESTUDIO'),
    ingresos: idx('PROMEDIO INGRESOS'),
    tiempo: idx('USO TIEMPO LIBRE'),
    raza: idx('RAZA'),
    trans: idx('MEDIO DE TRANSPORTE'),
    traslado: idx('TIEMPO DE TRASLADO'),
  };
  const telCols = headers.map((h, i) => (h === 'TELEFONO' ? i : -1)).filter((i) => i >= 0);

  let fabian: unknown[] | null = null;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (digits(row[C.doc]) === ALTA) {
      fabian = row;
      break;
    }
  }
  if (!fabian) throw new Error('No está Fabián en INGRESOS');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  const exists = await client.query(
    `SELECT id, status FROM associates
     WHERE regexp_replace(COALESCE(document_number,''), '[^0-9]', '', 'g') = $1`,
    [ALTA],
  );

  const catalogs = new Map<string, string>();
  const catKey = (kind: string, value: string) => `${kind}|${norm(value)}`;
  for (const row of (await client.query(`SELECT id, kind::text, value FROM catalog_values`)).rows) {
    catalogs.set(catKey(row.kind, row.value), row.id);
  }
  const ensureCat = async (kind: string, raw: string | null): Promise<string | null> => {
    const value = blankToNull(raw ?? '');
    if (!value) return null;
    const key = catKey(kind, value);
    if (catalogs.has(key)) return catalogs.get(key)!;
    const found = await client.query(
      `SELECT id FROM catalog_values WHERE kind=$1 AND upper(value)=upper($2) LIMIT 1`,
      [kind, value],
    );
    if (found.rowCount) {
      catalogs.set(key, found.rows[0].id);
      return found.rows[0].id;
    }
    const ins = await client.query(
      `INSERT INTO catalog_values (id, tenant_id, kind, value, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id`,
      [TENANT, kind, value.toUpperCase()],
    );
    catalogs.set(key, ins.rows[0].id);
    return ins.rows[0].id;
  };
  const positions = new Map<string, string>();
  for (const r of (await client.query(`SELECT id, upper(name) AS name FROM job_positions`)).rows) {
    positions.set(r.name, r.id);
  }
  const ensurePos = async (name: string, critical: boolean): Promise<string | null> => {
    const n = norm(name);
    if (!n) return null;
    if (positions.has(n)) return positions.get(n)!;
    const ins = await client.query(
      `INSERT INTO job_positions (id, tenant_id, name, is_critical, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id`,
      [TENANT, n, critical],
    );
    positions.set(n, ins.rows[0].id);
    return ins.rows[0].id;
  };
  const centers = new Map<string, string>();
  for (const r of (await client.query(`SELECT id, upper(code) AS code FROM work_centers`)).rows) {
    centers.set(r.code, r.id);
  }
  const ensureWc = async (codeRaw: string | null): Promise<string | null> => {
    const code = blankToNull(codeRaw ?? '');
    if (!code) return null;
    const key = norm(code);
    if (centers.has(key)) return centers.get(key)!;
    const ins = await client.query(
      `INSERT INTO work_centers (id, tenant_id, code, client_name, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id`,
      [TENANT, key, `Centro ${key}`],
    );
    centers.set(key, ins.rows[0].id);
    return ins.rows[0].id;
  };

  if (!exists.rowCount) {
    const row = fabian;
    const g = (c: number) => (c >= 0 ? row[c] : '');
    const cargoName = blankToNull(txt(g(C.cargo)));
    const critical = norm(txt(g(C.critico))).includes('CRITICO') && !norm(txt(g(C.critico))).includes('NO CRIT');
    const n1 = norm(txt(g(C.n1)));
    const ap1 = norm(txt(g(C.ap1)));
    const jobId = await ensurePos(cargoName || 'VIGILANTE', critical);
    const wcId = await ensureWc(txt(g(C.centro)));
    await client.query(
      `INSERT INTO associates (
         id, tenant_id, folder_number, act_reference, document_type, document_number,
         first_name, second_name, first_last_name, second_last_name,
         birth_date, sex_at_birth, marital_status, email, address, landline, mobile,
         emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
         hire_date, job_position_id, work_center_id, ordinary_compensation, average_monthly_salary,
         bank_account, psychophysical_valid, psychosensometric_valid,
         course_code, school_nit, course_certificate_number, has_sura_policy, funeral_service,
         children_count, dependents_count, estrato, life_plan,
         eps_id, pension_fund_id, blood_type_id, gender_id,
         sexual_orientation_id, religion_id, race_id, housing_type_id,
         education_level_id, income_range_id, transport_mean_id, commute_time_id,
         status, document_expedition_date
       ) VALUES (
         gen_random_uuid(), $1, $2, $3, $4::associate_document_type, $5,
         $6, $7, $8, $9,
         COALESCE($10::date, '1900-01-01'), $11::associate_sex_at_birth, $12::associate_marital_status,
         $13, $14, $15, COALESCE($16, ''),
         $17, $18, $19,
         COALESCE($20::date, CURRENT_DATE), $21, $22, COALESCE($23,0), COALESCE($24,0),
         $25, $26, $27,
         $28, $29, $30, $31, $32,
         $33, $34, $35, $36,
         $37, $38, $39, $40,
         $41, $42, $43, $44,
         $45, $46, $47, $48,
         'ACTIVO', $49
       )`,
      [
        TENANT,
        intOrNull(g(C.folder)),
        blankToNull(txt(g(C.acta))),
        mapDocType(txt(g(C.tipo))),
        ALTA,
        n1,
        blankToNull(norm(txt(g(C.n2)))),
        ap1,
        blankToNull(norm(txt(g(C.ap2)))),
        parseDate(g(C.nac)),
        mapSex(txt(g(C.sexo))),
        mapMarital(txt(g(C.civil))),
        blankToNull(txt(g(C.email))),
        blankToNull(txt(g(C.dir))),
        telCols[0] >= 0 ? blankToNull(txt(g(telCols[0]))) : null,
        blankToNull(txt(g(C.cel))),
        blankToNull(txt(g(C.emerg))),
        blankToNull(txt(g(C.parent))),
        telCols[1] >= 0 ? blankToNull(txt(g(telCols[1]))) : null,
        parseDate(g(C.ingreso)),
        jobId,
        wcId,
        money(g(C.ord)),
        money(g(C.prom)),
        blankToNull(txt(g(C.cuenta))),
        truthy(g(C.psico)),
        truthy(g(C.senso)),
        blankToNull(txt(g(C.curso))),
        blankToNull(txt(g(C.nit))),
        blankToNull(txt(g(C.nro))),
        truthy(g(C.sura)),
        blankToNull(txt(g(C.funer))),
        intOrNull(g(C.hijos)) ?? 0,
        intOrNull(g(C.cargoPers)) ?? 0,
        intOrNull(g(C.estrato)),
        blankToNull(txt(g(C.tiempo))),
        await ensureCat('EPS', txt(g(C.eps))),
        await ensureCat('FONDO_PENSION', txt(g(C.fondo))),
        await ensureCat('RH', txt(g(C.rh))),
        await ensureCat('GENERO', txt(g(C.genero))),
        await ensureCat('ORIENTACION_SEXUAL', txt(g(C.ori))),
        await ensureCat('RELIGION', txt(g(C.relig))),
        await ensureCat('RAZA', txt(g(C.raza))),
        await ensureCat('TIPO_VIVIENDA', txt(g(C.viv))),
        await ensureCat('NIVEL_ESTUDIO', txt(g(C.estudio))),
        await ensureCat('RANGO_INGRESOS', txt(g(C.ingresos))),
        await ensureCat('MEDIO_TRANSPORTE', txt(g(C.trans))),
        await ensureCat('TIEMPO_TRASLADO', txt(g(C.traslado))),
        parseDate(g(C.exp)),
      ],
    );
    console.log('ALTA', ALTA, n1, ap1, 'carpeta', intOrNull(g(C.folder)));
  } else {
    console.log('ALTA ya existía', exists.rows[0]);
  }

  const retired = await client.query(
    `UPDATE associates
     SET status = 'RETIRADO', updated_at = NOW()
     WHERE regexp_replace(COALESCE(document_number,''), '[^0-9]', '', 'g') = ANY($1::text[])
       AND status IS DISTINCT FROM 'RETIRADO'
     RETURNING document_number, first_name, first_last_name, folder_number, status`,
    [RETIROS],
  );
  console.log('RETIROS', retired.rowCount);
  for (const r of retired.rows) {
    console.log(
      r.document_number,
      r.first_name,
      r.first_last_name,
      'carpeta',
      r.folder_number,
      r.status,
    );
  }

  const stats = await client.query(
    `SELECT count(*) FILTER (WHERE status='ACTIVO') AS activos,
            count(*) FILTER (WHERE status='RETIRADO') AS retirados
     FROM associates`,
  );
  await client.end();
  console.log('BD', stats.rows[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
