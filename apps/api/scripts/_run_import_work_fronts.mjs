import fs from 'fs';
import dns from 'dns';
import { createRequire } from 'module';

dns.setDefaultResultOrder('ipv4first');
const require = createRequire(import.meta.url);
const { Client } = require('pg');

const DEFAULT_TENANT = '11111111-1111-1111-1111-111111111111';
const csvPath =
  process.env.WORK_FRONTS_CSV ||
  'C:\\Users\\jzapata\\Downloads\\servicios_por_puesto.csv';
const envPath = 'Z:\\Portal_Coraza\\apps\\api\\.env';

function loadEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (n) => headers.indexOf(n);
  const iCode = idx('code');
  const iServ = idx('servicio');
  const iHoras = idx('horas');
  const iDetalle = idx('detalle');
  const iObs = idx('observacion');
  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const code = String(cols[iCode] ?? '').trim();
    if (!code) continue;
    const horasRaw = iHoras >= 0 ? String(cols[iHoras] ?? '').trim() : '';
    rows.push({
      code,
      servicio: Number(cols[iServ]) || 0,
      horas: horasRaw === '' ? null : Number(horasRaw),
      detalle: iDetalle >= 0 ? String(cols[iDetalle] ?? '').trim() : '',
      observacion: iObs >= 0 ? String(cols[iObs] ?? '').trim() : '',
    });
  }
  return rows;
}

const env = loadEnv(envPath);
const tenantId = env.DEFAULT_TENANT_ID || env.TENANT_ID || DEFAULT_TENANT;
const apply = process.argv.includes('--apply');
const csvRows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const byCode = new Map();
for (const row of csvRows) {
  const list = byCode.get(row.code) ?? [];
  list.push(row);
  byCode.set(row.code, list);
}

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});
await client.connect();
try {
  const posts = await client.query(
    `SELECT id, code, name, status::text AS status
     FROM posts WHERE tenant_id = $1 AND status = 'ACTIVO'`,
    [tenantId],
  );
  const postByCode = new Map(posts.rows.map((p) => [p.code, p]));
  const missingOrInactive = [];
  const matchedCodes = [];
  let servicesToLoad = 0;
  for (const [code, services] of byCode) {
    if (!postByCode.has(code)) {
      missingOrInactive.push(code);
      continue;
    }
    matchedCodes.push(code);
    servicesToLoad += services.length;
  }

  let existingCounts = { rows: [] };
  try {
    existingCounts = await client.query(
      `SELECT post_id, COUNT(*)::text AS n FROM post_work_fronts GROUP BY post_id`,
    );
  } catch {
    /* table may not exist yet on dry-run before migrate */
  }
  const existingByPost = new Map(
    existingCounts.rows.map((r) => [r.post_id, Number(r.n)]),
  );

  let skipAlreadyHas = 0;
  let skipAlreadyServices = 0;
  const toInsert = [];
  for (const code of matchedCodes) {
    const post = postByCode.get(code);
    if ((existingByPost.get(post.id) ?? 0) > 0) {
      skipAlreadyHas++;
      skipAlreadyServices += byCode.get(code).length;
      continue;
    }
    toInsert.push({ postId: post.id, code, rows: byCode.get(code) });
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
    for (const c of missingOrInactive.sort((a, b) =>
      a.localeCompare(b, 'es'),
    )) {
      console.log(`  - ${c}`);
    }
  }
  console.log('---');
  console.log('expect_posts=185 expect_services=251');
  console.log(
    `ok_counts=${matchedCodes.length === 185 && servicesToLoad === 251 ? 'YES' : 'CHECK'}`,
  );

  if (!apply) {
    console.log('Dry-run OK. Nada escrito. Pasa --apply para cargar.');
  } else {
    await client.query('BEGIN');
    try {
      let inserted = 0;
      for (const item of toInsert) {
        for (const row of item.rows) {
          await client.query(
            `INSERT INTO post_work_fronts
               (tenant_id, post_id, front_number, hours, detail, notes, active)
             VALUES ($1,$2,$3,$4,$5,$6,TRUE)
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
      console.log(`applied_insert_attempts=${inserted}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  }
} finally {
  await client.end();
}
