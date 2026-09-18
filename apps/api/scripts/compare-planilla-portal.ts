/**
 * Consolida Planilla V17 (INGRESOS) contra asociados del Portal.
 * - Alta solo si la cédula está en el Excel y no en la BD.
 * - En coincidencias: rellena campos vacíos; no pisa datos que ya tiene el Portal.
 * - No crea personas solo por el Excel de ausentismo.
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
function emptyDb(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') {
    const s = v.trim();
    return !s || s === '1900-01-01' || s.toUpperCase() === 'NO INFORMA';
  }
  if (typeof v === 'number') return v === 0;
  return false;
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

  type ExcelP = {
    doc: string;
    n1: string;
    ap1: string;
    row: unknown[];
  };
  const excel = new Map<string, ExcelP>();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const doc = digits(row[C.doc]);
    const n1 = norm(txt(row[C.n1]));
    const ap1 = norm(txt(row[C.ap1]));
    if (!doc || !n1 || !ap1) continue;
    excel.set(doc, { doc, n1, ap1, row });
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  const dbRes = await client.query(
    `SELECT id, regexp_replace(COALESCE(document_number,''), '[^0-9]', '', 'g') AS doc,
            first_name, first_last_name, status,
            email, mobile, address, birth_date, hire_date, job_position_id, work_center_id
     FROM associates`,
  );
  const dbByDoc = new Map<string, (typeof dbRes.rows)[0]>();
  for (const r of dbRes.rows) {
    if (r.doc) dbByDoc.set(r.doc, r);
  }

  const onlyExcel: ExcelP[] = [];
  const both: ExcelP[] = [];
  for (const p of excel.values()) {
    if (dbByDoc.has(p.doc)) both.push(p);
    else onlyExcel.push(p);
  }
  let onlyDbActivo = 0;
  let onlyDbOtro = 0;
  for (const [doc, r] of dbByDoc) {
    if (excel.has(doc)) continue;
    if (r.status === 'ACTIVO') onlyDbActivo++;
    else onlyDbOtro++;
  }

  console.log('--- COMPARACIÓN Planilla INGRESOS vs Portal ---');
  console.log(`En Excel (ficha válida): ${excel.size}`);
  console.log(`En Portal (con cédula): ${dbByDoc.size}`);
  console.log(`En ambos (se completa huecos): ${both.length}`);
  console.log(`Solo en Excel (SE MONTA): ${onlyExcel.length}`);
  console.log(`Solo en Portal ACTIVO (se deja): ${onlyDbActivo}`);
  console.log(`Solo en Portal otro estado (se deja): ${onlyDbOtro}`);

  const catalogs = new Map<string, string>();
  const catKey = (kind: string, value: string) => `${kind}|${norm(value)}`;
  const catRows = await client.query(
    `SELECT id, kind::text, value FROM catalog_values WHERE tenant_id = $1 OR tenant_id IS NULL`,
    [TENANT],
  );
  for (const row of catRows.rows) catalogs.set(catKey(row.kind, row.value), row.id);

  const ensureCat = async (kind: string, raw: string | null): Promise<string | null> => {
    const value = blankToNull(raw ?? '');
    if (!value) return null;
    const key = catKey(kind, value);
    if (catalogs.has(key)) return catalogs.get(key)!;
    const found = await client.query(
      `SELECT id FROM catalog_values WHERE tenant_id=$1 AND kind=$2 AND upper(value)=upper($3) LIMIT 1`,
      [TENANT, kind, value],
    );
    if (found.rowCount) {
      catalogs.set(key, found.rows[0].id);
      return found.rows[0].id;
    }
    try {
      const ins = await client.query(
        `INSERT INTO catalog_values (id, tenant_id, kind, value, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, true) RETURNING id`,
        [TENANT, kind, value.toUpperCase()],
      );
      catalogs.set(key, ins.rows[0].id);
      return ins.rows[0].id;
    } catch {
      const again = await client.query(
        `SELECT id FROM catalog_values WHERE tenant_id=$1 AND kind=$2 LIMIT 50`,
        [TENANT, kind],
      );
      const hit = again.rows.find((r: { id: string; value?: string }) => catKey(kind, String(r.value ?? '')) === key);
      return hit?.id ?? null;
    }
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

  const build = async (p: ExcelP) => {
    const row = p.row;
    const g = (c: number) => (c >= 0 ? row[c] : '');
    const cargoName = blankToNull(txt(g(C.cargo)));
    const critical = norm(txt(g(C.critico))).includes('CRITICO') && !norm(txt(g(C.critico))).includes('NO CRIT');
    return {
      folder: intOrNull(g(C.folder)),
      acta: blankToNull(txt(g(C.acta))),
      tipo: mapDocType(txt(g(C.tipo))),
      doc: p.doc,
      n1: p.n1,
      n2: blankToNull(norm(txt(g(C.n2)))),
      ap1: p.ap1,
      ap2: blankToNull(norm(txt(g(C.ap2)))),
      birth: parseDate(g(C.nac)),
      exp: parseDate(g(C.exp)),
      email: blankToNull(txt(g(C.email))),
      dir: blankToNull(txt(g(C.dir))),
      tel: telCols[0] >= 0 ? blankToNull(txt(g(telCols[0]))) : null,
      cel: blankToNull(txt(g(C.cel))),
      emerg: blankToNull(txt(g(C.emerg))),
      parent: blankToNull(txt(g(C.parent))),
      emergTel: telCols[1] >= 0 ? blankToNull(txt(g(telCols[1]))) : null,
      hire: parseDate(g(C.ingreso)),
      jobId: await ensurePos(cargoName || 'SIN CARGO', critical),
      wcId: await ensureWc(txt(g(C.centro))),
      ord: money(g(C.ord)),
      prom: money(g(C.prom)),
      cuenta: blankToNull(txt(g(C.cuenta))),
      psico: truthy(g(C.psico)),
      senso: truthy(g(C.senso)),
      curso: blankToNull(txt(g(C.curso))),
      nit: blankToNull(txt(g(C.nit))),
      nro: blankToNull(txt(g(C.nro))),
      sura: truthy(g(C.sura)),
      funer: blankToNull(txt(g(C.funer))),
      sexo: mapSex(txt(g(C.sexo))),
      civil: mapMarital(txt(g(C.civil))),
      hijos: intOrNull(g(C.hijos)) ?? 0,
      dep: intOrNull(g(C.cargoPers)) ?? 0,
      estrato: intOrNull(g(C.estrato)),
      life: blankToNull(txt(g(C.tiempo))),
      epsId: await ensureCat('EPS', txt(g(C.eps))),
      fondoId: await ensureCat('FONDO_PENSION', txt(g(C.fondo))),
      rhId: await ensureCat('RH', txt(g(C.rh))),
      genId: await ensureCat('GENERO', txt(g(C.genero))),
      oriId: await ensureCat('ORIENTACION_SEXUAL', txt(g(C.ori))),
      relId: await ensureCat('RELIGION', txt(g(C.relig))),
      razaId: await ensureCat('RAZA', txt(g(C.raza))),
      vivId: await ensureCat('TIPO_VIVIENDA', txt(g(C.viv))),
      estId: await ensureCat('NIVEL_ESTUDIO', txt(g(C.estudio))),
      ingId: await ensureCat('RANGO_INGRESOS', txt(g(C.ingresos))),
      trId: await ensureCat('MEDIO_TRANSPORTE', txt(g(C.trans))),
      ttId: await ensureCat('TIEMPO_TRASLADO', txt(g(C.traslado))),
    };
  };

  let created = 0;
  for (const p of onlyExcel) {
    const x = await build(p);
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
        TENANT, x.folder, x.acta, x.tipo, x.doc,
        x.n1, x.n2, x.ap1, x.ap2,
        x.birth, x.sexo, x.civil, x.email, x.dir, x.tel, x.cel,
        x.emerg, x.parent, x.emergTel,
        x.hire, x.jobId, x.wcId, x.ord, x.prom,
        x.cuenta, x.psico, x.senso,
        x.curso, x.nit, x.nro, x.sura, x.funer,
        x.hijos, x.dep, x.estrato, x.life,
        x.epsId, x.fondoId, x.rhId, x.genId,
        x.oriId, x.relId, x.razaId, x.vivId,
        x.estId, x.ingId, x.trId, x.ttId,
        x.exp,
      ],
    );
    created++;
  }

  let filled = 0;
  for (const p of both) {
    const db = dbByDoc.get(p.doc)!;
    const full = await client.query(`SELECT * FROM associates WHERE id = $1`, [db.id]);
    const cur = full.rows[0];
    const x = await build(p);
    const set: string[] = [];
    const args: unknown[] = [];
    const add = (col: string, excelVal: unknown, dbVal: unknown) => {
      if (excelVal == null || excelVal === '') return;
      if (!emptyDb(dbVal)) return;
      args.push(excelVal);
      set.push(`${col} = $${args.length + 1}`);
    };
    add('folder_number', x.folder, cur.folder_number);
    add('act_reference', x.acta, cur.act_reference);
    add('second_name', x.n2, cur.second_name);
    add('second_last_name', x.ap2, cur.second_last_name);
    add('birth_date', x.birth, cur.birth_date);
    add('document_expedition_date', x.exp, cur.document_expedition_date);
    add('email', x.email, cur.email);
    add('address', x.dir, cur.address);
    add('landline', x.tel, cur.landline);
    add('mobile', x.cel, cur.mobile);
    add('emergency_contact_name', x.emerg, cur.emergency_contact_name);
    add('emergency_contact_relationship', x.parent, cur.emergency_contact_relationship);
    add('emergency_contact_phone', x.emergTel, cur.emergency_contact_phone);
    add('hire_date', x.hire, cur.hire_date);
    add('job_position_id', x.jobId, cur.job_position_id);
    add('work_center_id', x.wcId, cur.work_center_id);
    add('ordinary_compensation', x.ord, Number(cur.ordinary_compensation));
    add('average_monthly_salary', x.prom, Number(cur.average_monthly_salary));
    add('bank_account', x.cuenta, cur.bank_account);
    add('course_code', x.curso, cur.course_code);
    add('school_nit', x.nit, cur.school_nit);
    add('course_certificate_number', x.nro, cur.course_certificate_number);
    add('funeral_service', x.funer, cur.funeral_service);
    add('life_plan', x.life, cur.life_plan);
    add('eps_id', x.epsId, cur.eps_id);
    add('pension_fund_id', x.fondoId, cur.pension_fund_id);
    add('blood_type_id', x.rhId, cur.blood_type_id);
    add('gender_id', x.genId, cur.gender_id);
    add('sexual_orientation_id', x.oriId, cur.sexual_orientation_id);
    add('religion_id', x.relId, cur.religion_id);
    add('race_id', x.razaId, cur.race_id);
    add('housing_type_id', x.vivId, cur.housing_type_id);
    add('education_level_id', x.estId, cur.education_level_id);
    add('income_range_id', x.ingId, cur.income_range_id);
    add('transport_mean_id', x.trId, cur.transport_mean_id);
    add('commute_time_id', x.ttId, cur.commute_time_id);
    add('sex_at_birth', x.sexo, cur.sex_at_birth);
    add('marital_status', x.civil, cur.marital_status);
    add('estrato', x.estrato, cur.estrato);
    if (!set.length) continue;
    args.unshift(db.id);
    await client.query(
      `UPDATE associates SET ${set.join(', ')}, updated_at = NOW() WHERE id = $1`,
      args,
    );
    filled++;
  }

  const stats = await client.query(
    `SELECT count(*) FILTER (WHERE status='ACTIVO') AS activos, count(*) AS total FROM associates`,
  );
  await client.end();
  console.log(`Altas nuevas desde Excel: ${created}`);
  console.log(`Fichas existentes completadas (solo huecos): ${filled}`);
  console.log('BD', stats.rows[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
