/**
 * apply-073-posts-inactive-fields.ts
 * Aplica en la BD la migración 073_posts_inactive_fields.sql de forma
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
    '073_posts_inactive_fields.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler')
      ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  try {
    await client.query(sql);
    const info = await client.query<{ column_name: string; data_type: string; is_nullable: string }>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name IN ('inactive_date', 'inactive_reason', 'inactive_notes')
      ORDER BY column_name
    `);
    console.log('✔ Migración aplicada. Columnas:');
    console.table(info.rows);
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
