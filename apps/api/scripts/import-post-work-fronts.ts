/**
 * Importa servicios/frentes desde CSV (code = posts.code).
 * Por defecto --dry-run (no escribe). Usa --apply para insertar.
 *
 * npx ts-node --transpile-only scripts/import-post-work-fronts.ts
 * npx ts-node --transpile-only scripts/import-post-work-fronts.ts --apply
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_TENANT = '11111111-1111-1111-1111-111111111111';
const DEFAULT_CSV =
  process.env.WORK_FRONTS_CSV ||
  'C:\\Users\\jzapata\\Downloads\\servicios_por_puesto.csv';

type CsvRow = {
  code: string;
  puesto_portal: string;
  servicio: number;
  horas: number | null;
  tipo: string;
  detalle: string;
  observacion: string;
};

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iCode = idx('code');
  const iPuesto = idx('puesto_portal');
  const iServ = idx('servicio');
  const iHoras = idx('horas');
  const iTipo = idx('tipo');
  const iDetalle = idx('detalle');
  const iObs = idx('observacion');
  if (iCode < 0 || iServ < 0) {
    throw new Error('CSV debe tener columnas code y servicio');
  }

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const code = String(cols[iCode] ?? '').trim();
    if (!code) continue;
    const horasRaw = iHoras >= 0 ? String(cols[iHoras] ?? '').trim() : '';
    rows.push({
      code,
      puesto_portal: iPuesto >= 0 ? String(cols[iPuesto] ?? '').trim() : '',
      servicio: Number(cols[iServ]) || 0,
      horas: horasRaw === '' ? null : Number(horasRaw),
      tipo: iTipo >= 0 ? String(cols[iTipo] ?? '').trim() : '',
      detalle: iDetalle >= 0 ? String(cols[iDetalle] ?? '').trim() : '',
      observacion: iObs >= 0 ? String(cols[iObs] ?? '').trim() : '',
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const csvPath = DEFAULT_CSV;
  const tenantId =
    process.env.DEFAULT_TENANT_ID || process.env.TENANT_ID || DEFAULT_TENANT;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  if (!fs.existsSync(csvPath)) throw new Error(`No existe CSV: ${csvPath}`);

  const csvRows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const byCode = new Map<string, CsvRow[]>();
  for (const row of csvRows) {
    const list = byCode.get(row.code) ?? [];
    list.push(row);
    byCode.set(row.code, list);
  }

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 20000,
  });
  await client.connect();

  try {
    const posts = await client.query<{
      id: string;
      code: string;
      name: string;
      status: string;
    }>(
      `SELECT id, code, name, status::text AS status
       FROM posts
       WHERE tenant_id = $1 AND status = 'ACTIVO'`,
      [tenantId],
    );
    const postByCode = new Map(posts.rows.map((p) => [p.code, p]));

    const missingOrInactive: string[] = [];
    const matchedCodes: string[] = [];
    let servicesToLoad = 0;
    let skipAlreadyHas = 0;
    let skipAlreadyServices = 0;

    for (const [code, services] of byCode) {
      const post = postByCode.get(code);
      if (!post) {
        missingOrInactive.push(code);
        continue;
      }
      matchedCodes.push(code);
      servicesToLoad += services.length;
    }

    // Puestos ya con frentes (idempotencia)
    const existingCounts = await client.query<{ post_id: string; n: string }>(
      `SELECT post_id, COUNT(*)::text AS n
       FROM post_work_fronts
       GROUP BY post_id`,
    ).catch(() => ({ rows: [] as { post_id: string; n: string }[] }));

    const existingByPost = new Map(
      existingCounts.rows.map((r) => [r.post_id, Number(r.n)]),
    );

    const toInsert: { postId: string; code: string; rows: CsvRow[] }[] = [];
    for (const code of matchedCodes) {
      const post = postByCode.get(code)!;
      if ((existingByPost.get(post.id) ?? 0) > 0) {
        skipAlreadyHas++;
        skipAlreadyServices += byCode.get(code)!.length;
        continue;
      }
      toInsert.push({ postId: post.id, code, rows: byCode.get(code)! });
    }

    const insertPosts = toInsert.length;
    const insertServices = toInsert.reduce((n, x) => n + x.rows.length, 0);

    console.log('=== import-post-work-fronts ===');
    console.log(`mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
    console.log(`tenant=${tenantId}`);
    console.log(`csv=${csvPath}`);
    console.log(`csv_rows=${csvRows.length}`);
    console.log(`csv_posts=${byCode.size}`);
    console.log(`matched_active_posts=${matchedCodes.length}`);
    console.log(`matched_services=${servicesToLoad}`);
    console.log(`would_insert_posts=${insertPosts}`);
    console.log(`would_insert_services=${insertServices}`);
    console.log(`skip_already_has_fronts_posts=${skipAlreadyHas}`);
    console.log(`skip_already_has_fronts_services=${skipAlreadyServices}`);
    console.log(`missing_or_inactive_codes=${missingOrInactive.length}`);
    if (missingOrInactive.length) {
      console.log('codes_not_found_or_inactive:');
      for (const c of missingOrInactive.sort((a, b) => a.localeCompare(b, 'es'))) {
        console.log(`  - ${c}`);
      }
    }

    // Expectativa del negocio
    console.log('---');
    console.log(`expect_posts=185 expect_services=251`);
    console.log(
      `ok_counts=${matchedCodes.length === 185 && servicesToLoad === 251 ? 'YES' : 'CHECK'}`,
    );

    if (!apply) {
      console.log('Dry-run OK. Nada escrito. Pasa --apply para cargar.');
      return;
    }

    // Asegurar tabla
    const table = await client.query(
      `SELECT to_regclass('public.post_work_fronts') AS t`,
    );
    if (!table.rows[0]?.t) {
      throw new Error('Falta tabla post_work_fronts. Aplica migración 074 primero.');
    }

    let inserted = 0;
    await client.query('BEGIN');
    try {
      for (const item of toInsert) {
        for (const row of item.rows) {
          await client.query(
            `INSERT INTO post_work_fronts
               (tenant_id, post_id, front_number, hours, detail, notes, active)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE)
             ON CONFLICT (post_id, front_number) DO NOTHING`,
            [
              tenantId,
              item.postId,
              row.servicio,
              row.horas,
              row.detalle || null,
              row.observacion || null,
            ],
          );
          inserted++;
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    console.log(`applied_insert_attempts=${inserted}`);
    const total = await client.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM post_work_fronts WHERE tenant_id = $1`,
      [tenantId],
    );
    console.log(`db_work_fronts_total=${total.rows[0]?.n}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
