/**
 * Aplica 081_radio_control.sql (idempotente).
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');
  const sqlPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'supabase',
    'migrations',
    '081_radio_control.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  try {
    await client.query(sql);
    const t = await client.query(
      `SELECT COUNT(*)::int AS n FROM information_schema.tables
       WHERE table_schema='public' AND table_name='radio_control_checks'`,
    );
    const p = await client.query(
      `SELECT code FROM permissions WHERE code LIKE 'radio_control.%' ORDER BY 1`,
    );
    console.log(
      '✔ 081 radio_control. table=',
      t.rows[0]?.n,
      'perms=',
      p.rows.map((r) => r.code).join(','),
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
