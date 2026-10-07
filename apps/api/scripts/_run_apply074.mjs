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

const root = new URL('..', import.meta.url);
const env = loadEnv(new URL('.env', root).pathname.replace(/^\//, ''));
// Windows path from file URL
const envPath = 'Z:\\Portal_Coraza\\apps\\api\\.env';
const sqlPath =
  'Z:\\Portal_Coraza\\supabase\\migrations\\074_post_work_fronts.sql';
const env2 = loadEnv(envPath);
const sql = fs.readFileSync(sqlPath, 'utf8');
const client = new Client({
  connectionString: env2.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});
await client.connect();
try {
  await client.query(sql);
  const r = await client.query(
    "SELECT to_regclass('public.post_work_fronts') AS t",
  );
  console.log('migration_ok', r.rows[0].t);
} finally {
  await client.end();
}
