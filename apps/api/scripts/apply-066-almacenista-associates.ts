/**
 * Aplica 066: ALMACENISTA recupera associates.view/create/edit.
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
  if (!url) throw new Error('Falta DATABASE_URL');
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      'supabase',
      'migrations',
      '066_almacenista_associates_full.sql',
    ),
    'utf8',
  );
  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    await client.query(sql);
    const r = await client.query<{ role: string; perm: string }>(`
      SELECT r.code AS role, p.code AS perm
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'ALMACENISTA'
        AND p.code LIKE 'associates.%'
      ORDER BY p.code
    `);
    console.log('OK 066 ALMACENISTA associates.*');
    for (const row of r.rows) console.log(`  ${row.role} | ${row.perm}`);
    const need = ['associates.view', 'associates.create', 'associates.edit'];
    for (const code of need) {
      if (!r.rows.some((x) => x.perm === code)) {
        throw new Error(`ALMACENISTA sin ${code}`);
      }
    }
    if (r.rows.some((x) => x.perm === 'associates.retire')) {
      console.warn('nota: ALMACENISTA tiene associates.retire (no pedido en 066)');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
