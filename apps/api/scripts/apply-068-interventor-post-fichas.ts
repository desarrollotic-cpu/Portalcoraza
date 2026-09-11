/**
 * Aplica 068: rol INTERVENTOR con reception.view + posts.view.
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
      '068_interventor_post_fichas.sql',
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
    const r = await client.query<{ perm: string }>(`
      SELECT p.code AS perm
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'INTERVENTOR'
      ORDER BY p.code
    `);
    console.log(
      'OK 068 INTERVENTOR →',
      r.rows.map((x) => x.perm).join(', ') || '(sin permisos)',
    );
    if (!r.rows.some((x) => x.perm === 'reception.view')) {
      throw new Error('INTERVENTOR sin reception.view');
    }
    if (!r.rows.some((x) => x.perm === 'posts.view')) {
      throw new Error('INTERVENTOR sin posts.view');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
