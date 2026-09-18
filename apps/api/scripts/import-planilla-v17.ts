/**
 * Importa personal ACTIVO desde PLANILLA V17 (hoja INGRESOS).
 * Usa la copia abierta: PLANILLA_V17_OPEN.xlsx
 */
import * as dns from 'dns';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as XLSX from 'xlsx';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TENANT = '11111111-1111-1111-1111-111111111111';
const FILE = 'C:/Users/gdocumental/Downloads/GESTION HUMANA/PLANILLA_V17_OPEN.xlsx';

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function txt(v: unknown): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function blankToNull(v: string): string | null {
  const s = txt(v);
  if (!s || s.toUpperCase() === 'NO INFORMA' || s.toUpperCase() === 'N/A' || s === '-') return null;
  return s;
}

function digits(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

function money(v: unknown): number {
  const n = Number(
    String(v ?? '')
      .replace(/[$\s]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.'),
  );
  return Number.isFinite(n) ? n : 0;
}

function intOr(v: unknown, fallback = 0): number {
  const n = Number(String(v ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
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
  let a = Number(m[1]);
  let b = Number(m[2]);
  let y = Number(m[3].length === 2 ? (Number(m[3]) >= 40 ? `19${m[3]}` : `20${m[3]}`) : m[3]);
  let day: number;
  let month: number;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else if (b > 12 && a <= 12) {
    month = a;
    day = b;
  } else {
    day = a;
    month = b; // Colombia d/m/y
  }
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
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  }) as unknown[][];

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
    folder: idx('Nº CARPETA', 'N CARPETA', 'CARPETA ACTUAL'),
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
    tel: idx('TELEFONO'),
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

  const telCols = headers
    .map((h, i) => (h === 'TELEFONO' ? i : -1))
    .filter((i) => i >= 0);
  const telFijo = telCols[0] ?? C.tel;
  const telEmerg = telCols[1] ?? -1;

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  const catalogs = new Map<string, string>();
  const catKey = (kind: string, value: string) => `${kind}|${norm(value)}`;
  const loadCat = async () => {
    const r = await client.query(
      `SELECT id, kind::text, value FROM catalog_values WHERE tenant_id = $1 OR tenant_id IS NULL`,
      [TENANT],
    );
    for (const row of r.rows) catalogs.set(catKey(row.kind, row.value), row.id);
  };
  await loadCat();

  const ensureCat = async (kind: string, raw: string | null): Promise<string | null> => {
    const value = blankToNull(raw ?? '');
    if (!value) return null;
    const key = catKey(kind, value);
    const hit = catalogs.get(key);
    if (hit) return hit;
    const found = await client.query(
      `SELECT id FROM catalog_values
       WHERE tenant_id = $1 AND kind = $2
         AND upper(value) = upper($3)
       LIMIT 1`,
      [TENANT, kind, value],
    );
    if (found.rowCount) {
      catalogs.set(key, found.rows[0].id);
      return found.rows[0].id;
    }
    const ins = await client.query(
      `INSERT INTO catalog_values (id, tenant_id, kind, value, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true)
       RETURNING id`,
      [TENANT, kind, value.toUpperCase()],
    );
    catalogs.set(key, ins.rows[0].id);
    return ins.rows[0].id;
  };

  const positions = new Map<string, string>();
  const posRes = await client.query(`SELECT id, upper(name) AS name FROM job_positions`);
  for (const r of posRes.rows) positions.set(r.name, r.id);

  const ensurePos = async (name: string, critical: boolean): Promise<string | null> => {
    const n = norm(name);
    if (!n) return null;
    const hit = positions.get(n);
    if (hit) {
      if (critical) {
        await client.query(`UPDATE job_positions SET is_critical = true WHERE id = $1 AND is_critical = false`, [hit]);
      }
      return hit;
    }
    const ins = await client.query(
      `INSERT INTO job_positions (id, tenant_id, name, is_critical, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true)
       RETURNING id`,
      [TENANT, n, critical],
    );
    positions.set(n, ins.rows[0].id);
    return ins.rows[0].id;
  };

  const centers = new Map<string, string>();
  const wcRes = await client.query(`SELECT id, upper(code) AS code FROM work_centers`);
  for (const r of wcRes.rows) centers.set(r.code, r.id);

  const ensureWc = async (codeRaw: string | null): Promise<string | null> => {
    const code = blankToNull(codeRaw ?? '');
    if (!code) return null;
    const key = norm(code);
    const hit = centers.get(key);
    if (hit) return hit;
    const ins = await client.query(
      `INSERT INTO work_centers (id, tenant_id, code, client_name, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, true)
       RETURNING id`,
      [TENANT, key, `Centro ${key}`],
    );
    centers.set(key, ins.rows[0].id);
    return ins.rows[0].id;
  };

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const docs: string[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const get = (c: number) => (c >= 0 ? row[c] : '');
    const doc = digits(get(C.doc));
    const n1 = norm(txt(get(C.n1)));
    const ap1 = norm(txt(get(C.ap1)));
    if (!doc || !n1 || !ap1) {
      skipped++;
      continue;
    }
    docs.push(doc);

    const birth = parseDate(get(C.nac)) || '1900-01-01';
    const hire = parseDate(get(C.ingreso)) || new Date().toISOString().slice(0, 10);
    const cargoName = blankToNull(txt(get(C.cargo)));
    const critical = norm(txt(get(C.critico))).includes('CRITICO') && !norm(txt(get(C.critico))).includes('NO CRIT');
    const jobId = await ensurePos(cargoName || 'SIN CARGO', critical);
    const wcId = await ensureWc(txt(get(C.centro)));

    const payload = {
      folder: intOr(get(C.folder), 0) || null,
      acta: blankToNull(txt(get(C.acta))),
      tipo: mapDocType(txt(get(C.tipo))),
      n2: blankToNull(norm(txt(get(C.n2)))),
      ap2: blankToNull(norm(txt(get(C.ap2)))),
      exp: parseDate(get(C.exp)),
      email: blankToNull(txt(get(C.email))),
      dir: blankToNull(txt(get(C.dir))),
      tel: blankToNull(txt(get(telFijo))),
      cel: blankToNull(txt(get(C.cel))) || '',
      emerg: blankToNull(txt(get(C.emerg))),
      parent: blankToNull(txt(get(C.parent))),
      emergTel: telEmerg >= 0 ? blankToNull(txt(get(telEmerg))) : null,
      psico: truthy(get(C.psico)),
      senso: truthy(get(C.senso)),
      ord: money(get(C.ord)),
      prom: money(get(C.prom)),
      funer: blankToNull(txt(get(C.funer))),
      sura: truthy(get(C.sura)),
      cuenta: blankToNull(txt(get(C.cuenta))),
      curso: blankToNull(txt(get(C.curso))),
      nit: blankToNull(txt(get(C.nit))),
      nro: blankToNull(txt(get(C.nro))),
      sexo: mapSex(txt(get(C.sexo))),
      civil: mapMarital(txt(get(C.civil))),
      hijos: intOr(get(C.hijos), 0),
      dep: intOr(get(C.cargoPers), 0),
      estrato: intOr(get(C.estrato), 0) || null,
      life: blankToNull(txt(get(C.tiempo))),
    };

    const epsId = await ensureCat('EPS', txt(get(C.eps)));
    const fondoId = await ensureCat('FONDO_PENSION', txt(get(C.fondo)));
    const rhId = await ensureCat('RH', txt(get(C.rh)));
    const genId = await ensureCat('GENERO', txt(get(C.genero)));
    const oriId = await ensureCat('ORIENTACION_SEXUAL', txt(get(C.ori)));
    const relId = await ensureCat('RELIGION', txt(get(C.relig)));
    const razaId = await ensureCat('RAZA', txt(get(C.raza)));
    const vivId = await ensureCat('TIPO_VIVIENDA', txt(get(C.viv)));
    const estId = await ensureCat('NIVEL_ESTUDIO', txt(get(C.estudio)));
    const ingId = await ensureCat('RANGO_INGRESOS', txt(get(C.ingresos)));
    const trId = await ensureCat('MEDIO_TRANSPORTE', txt(get(C.trans)));
    const ttId = await ensureCat('TIEMPO_TRASLADO', txt(get(C.traslado)));

    const exists = await client.query(
      `SELECT id FROM associates WHERE regexp_replace(COALESCE(document_number,''), '[^0-9]', '', 'g') = $1 LIMIT 1`,
      [doc],
    );

    const vals = [
      payload.folder,
      payload.acta,
      payload.tipo,
      doc,
      n1,
      payload.n2,
      ap1,
      payload.ap2,
      birth,
      payload.sexo,
      payload.civil,
      payload.email,
      payload.dir,
      payload.tel,
      payload.cel,
      payload.emerg,
      payload.parent,
      payload.emergTel,
      hire,
      jobId,
      wcId,
      payload.ord,
      payload.prom,
      payload.cuenta,
      payload.psico,
      payload.senso,
      payload.curso,
      payload.nit,
      payload.nro,
      payload.sura,
      payload.funer,
      payload.hijos,
      payload.dep,
      payload.estrato,
      payload.life,
      epsId,
      fondoId,
      rhId,
      genId,
      oriId,
      relId,
      razaId,
      vivId,
      estId,
      ingId,
      trId,
      ttId,
    ];

    if (exists.rowCount) {
      await client.query(
        `UPDATE associates SET
           folder_number=$2, act_reference=$3, document_type=$4::associate_document_type,
           document_number=$5, first_name=$6, second_name=$7, first_last_name=$8, second_last_name=$9,
           birth_date=$10, sex_at_birth=$11::associate_sex_at_birth, marital_status=$12::associate_marital_status,
           email=$13, address=$14, landline=$15, mobile=$16,
           emergency_contact_name=$17, emergency_contact_relationship=$18, emergency_contact_phone=$19,
           hire_date=$20, job_position_id=$21, work_center_id=$22,
           ordinary_compensation=$23, average_monthly_salary=$24, bank_account=$25,
           psychophysical_valid=$26, psychosensometric_valid=$27,
           course_code=$28, school_nit=$29, course_certificate_number=$30,
           has_sura_policy=$31, funeral_service=$32,
           children_count=$33, dependents_count=$34, estrato=$35, life_plan=$36,
           eps_id=$37, pension_fund_id=$38, blood_type_id=$39, gender_id=$40,
           sexual_orientation_id=$41, religion_id=$42, race_id=$43, housing_type_id=$44,
           education_level_id=$45, income_range_id=$46, transport_mean_id=$47, commute_time_id=$48,
           status='ACTIVO', document_expedition_date=$49, updated_at=NOW()
         WHERE id=$1`,
        [exists.rows[0].id, ...vals, payload.exp],
      );
      updated++;
    } else {
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
           $10, $11::associate_sex_at_birth, $12::associate_marital_status, $13, $14, $15, $16,
           $17, $18, $19,
           $20, $21, $22, $23, $24,
           $25, $26, $27,
           $28, $29, $30, $31, $32,
           $33, $34, $35, $36,
           $37, $38, $39, $40,
           $41, $42, $43, $44,
           $45, $46, $47, $48,
           'ACTIVO', $49
         )`,
        [TENANT, ...vals, payload.exp],
      );
      created++;
    }
  }

  const stats = await client.query(
    `SELECT count(*) FILTER (WHERE status='ACTIVO') AS activos, count(*) AS total FROM associates`,
  );
  await client.end();
  console.log(`Planilla INGRESOS: creados=${created} actualizados=${updated} omitidos=${skipped} filas_ok=${docs.length}`);
  console.log('BD', stats.rows[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
