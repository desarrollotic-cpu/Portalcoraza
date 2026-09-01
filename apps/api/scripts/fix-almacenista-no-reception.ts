/**
 * Quita reception.* del rol ALMACENISTA (y SUPERVISOR si aplica).
 * Causa: migration 022_reception.sql se los asignó por error.
 * Uso: npx ts-node -r dotenv/config scripts/fix-almacenista-no-reception.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();

  try {
    const before = await client.query<{ role: string; code: string }>(
      `SELECT r.code AS role, p.code
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.code IN ('ALMACENISTA', 'SUPERVISOR', 'RECEPCIONISTA', 'GERENCIA')
         AND p.code LIKE 'reception.%'
       ORDER BY r.code, p.code`,
    );
    console.log('Antes:');
    for (const row of before.rows) console.log(`  ${row.role} → ${row.code}`);

    const del = await client.query(
      `DELETE FROM role_permissions rp
       USING roles r, permissions p
       WHERE rp.role_id = r.id
         AND rp.permission_id = p.id
         AND r.code IN ('ALMACENISTA', 'SUPERVISOR')
         AND p.code IN ('reception.view', 'reception.register', 'reception.exit')
       RETURNING r.code AS role, p.code AS permission`,
    );
    console.log(`\nEliminados: ${del.rowCount}`);
    for (const row of del.rows) console.log(`  - ${row.role} / ${row.permission}`);

    // Asegurar RECEPCIONISTA tenga los tres
    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES ('RECEPCIONISTA', 'Recepcionista', 'Registro y control de visitantes en recepción')
      ON CONFLICT (code) DO NOTHING
    `);
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id
       FROM roles r
       CROSS JOIN permissions p
       WHERE r.code = 'RECEPCIONISTA'
         AND p.code IN ('reception.view', 'reception.register', 'reception.exit')
       ON CONFLICT DO NOTHING`,
    );

    const after = await client.query<{ role: string; code: string }>(
      `SELECT r.code AS role, p.code
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.code LIKE 'reception.%'
       ORDER BY r.code, p.code`,
    );
    console.log('\nDespués (quién tiene reception.*):');
    for (const row of after.rows) console.log(`  ${row.role} → ${row.code}`);

    const alm = await client.query<{ code: string }>(
      `SELECT p.code
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.code = 'ALMACENISTA'
       ORDER BY p.code`,
    );
    console.log('\nPermisos actuales ALMACENISTA:');
    for (const row of alm.rows) console.log(`  - ${row.code}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
