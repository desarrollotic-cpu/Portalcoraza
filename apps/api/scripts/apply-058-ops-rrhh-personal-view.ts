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
      '058_ops_modules_rrhh_personal_view.sql',
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
      WHERE r.code IN ('ALMACENISTA', 'PROGRAMADOR', 'RECEPCIONISTA')
        AND p.code LIKE 'associates.%'
      ORDER BY r.code, p.code
    `);
    console.log('OK 058 associates.*');
    for (const row of r.rows) console.log(`  ${row.role} | ${row.perm}`);
    const writes = r.rows.filter((x) => x.perm !== 'associates.view');
    if (writes.length) {
      throw new Error(
        'No debe haber create/edit/retire en estos roles: ' +
          writes.map((x) => `${x.role}:${x.perm}`).join(', '),
      );
    }
    if (!r.rows.some((x) => x.role === 'ALMACENISTA' && x.perm === 'associates.view')) {
      throw new Error('ALMACENISTA no recibió associates.view');
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
