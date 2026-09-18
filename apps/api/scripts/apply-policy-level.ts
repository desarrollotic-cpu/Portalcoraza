/**
 * apply-policy-level.ts
 * Aplica en la BD la migración 072_associates_policy_level.sql de forma
 * idempotente. Se usa una sola vez para no esperar el pipeline de Render.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');

  const sqlPath = path.join(
    __dirname, '..', '..', '..', 'supabase', 'migrations',
    '072_associates_policy_level.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler')
      ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query(sql);
    const info = await client.query<{ column_name: string; data_type: string; is_nullable: string }>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'associates' AND column_name = 'policy_level'
    `);
    console.log('✔ Migración aplicada. Columna:');
    console.table(info.rows);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
