/**
 * Aplica 053: operations.view (sin RECEPCIONISTA) y RRHH sin alta/edición de puestos.
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
      '053_operations_view_rrhh_readonly.sql',
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
    const ops = await client.query(`
      SELECT r.code AS role
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'operations.view'
      ORDER BY r.code`);
    const rrhh = await client.query(`
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'RRHH'
        AND p.code IN (
          'posts.create', 'posts.edit', 'posts.view',
          'work_centers.create', 'work_centers.edit', 'work_centers.view',
          'operations.view'
        )
      ORDER BY p.code`);
    const rec = await client.query(`
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'RECEPCIONISTA'
        AND p.code IN ('posts.view', 'posts.create', 'posts.edit', 'operations.view', 'reception.view')
      ORDER BY p.code`);
    console.log(
      'operations.view en:',
      ops.rows.map((x) => x.role).join(', ') || '(nadie)',
    );
    console.log(
      'RRHH puestos/centros:',
      rrhh.rows.map((x) => x.code).join(', ') || '(nada)',
    );
    console.log(
      'RECEPCIONISTA:',
      rec.rows.map((x) => x.code).join(', ') || '(nada)',
    );
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
