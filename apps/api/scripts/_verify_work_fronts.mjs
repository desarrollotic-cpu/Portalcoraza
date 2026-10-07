import fs from 'fs';
import dns from 'dns';
import { createRequire } from 'module';

dns.setDefaultResultOrder('ipv4first');
const require = createRequire(import.meta.url);
const { Client } = require('pg');

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

const TENANT = '11111111-1111-1111-1111-111111111111';
const CODES = ['407', '1107', '589', '1142', '1105'];

function labelFor(rows) {
  const by = new Map();
  for (const r of rows) {
    const key = r.hours == null ? 'var' : String(r.hours);
    by.set(key, (by.get(key) ?? 0) + 1);
  }
  const ordered = [...by.entries()].sort((a, b) => {
    if (a[0] === 'var') return 1;
    if (b[0] === 'var') return -1;
    if (a[0] === '24') return -1;
    if (b[0] === '24') return 1;
    if (a[0] === '12') return -1;
    if (b[0] === '12') return 1;
    return Number(b[0]) - Number(a[0]);
  });
  return ordered
    .map(([h, n]) =>
      h === 'var'
        ? n === 1
          ? '1 × horario variable'
          : `${n} × horario variable`
        : `${n} × ${h}h`,
    )
    .join(' + ');
}

const env = loadEnv('Z:\\Portal_Coraza\\apps\\api\\.env');
const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});
await client.connect();
try {
  const totals = await client.query(
    `SELECT
       COUNT(DISTINCT f.post_id)::int AS posts,
       COUNT(*)::int AS services
     FROM post_work_fronts f
     JOIN posts p ON p.id = f.post_id
     WHERE f.tenant_id = $1 AND f.active = TRUE AND p.status = 'ACTIVO'`,
    [TENANT],
  );
  console.log('=== totals (active fronts on active posts) ===');
  console.log(`posts=${totals.rows[0].posts}`);
  console.log(`services=${totals.rows[0].services}`);

  const detail = await client.query(
    `SELECT p.code, p.name, f.front_number, f.hours, f.detail, f.active
     FROM posts p
     JOIN post_work_fronts f ON f.post_id = p.id
     WHERE p.tenant_id = $1 AND p.code = ANY($2::text[])
     ORDER BY p.code, f.front_number`,
    [TENANT, CODES],
  );

  const byCode = new Map();
  for (const row of detail.rows) {
    const list = byCode.get(row.code) ?? [];
    list.push(row);
    byCode.set(row.code, list);
  }

  console.log('=== sample posts ===');
  for (const code of CODES) {
    const rows = (byCode.get(code) ?? []).filter((r) => r.active !== false);
    const name = rows[0]?.name ?? '(sin frentes)';
    console.log(`code=${code} name=${name}`);
    console.log(`  label=${labelFor(rows)}`);
    for (const r of rows) {
      console.log(
        `  #${r.front_number} hours=${r.hours ?? 'NULL'} detail=${r.detail ?? ''}`,
      );
    }
  }
} finally {
  await client.end();
}
