/**
 * Rol CONTROL + usuario operativo del reporte de radio.
 * Uso: npx ts-node -r dotenv/config scripts/seed-control.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const EMAIL = (process.env.SEED_CONTROL_EMAIL ?? 'control@corazaseguridadcta.com').toLowerCase();
const PASSWORD = process.env.SEED_CONTROL_PASSWORD ?? 'Control2026*';
const FULL_NAME = process.env.SEED_CONTROL_NAME ?? 'Control de Radio';
const ROLE_CODE = 'CONTROL';

const PERMS = [
  'radio_control.view',
  'radio_control.edit',
  'notifications.view',
  'notifications.read',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 20000,
  });
  await client.connect();

  try {
    const tenant = (
      await client.query<{ tenant_id: string }>(
        `SELECT tenant_id FROM posts GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1`,
      )
    ).rows[0]?.tenant_id;
    if (!tenant) throw new Error('No hay tenant_id');

    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES (
        'CONTROL',
        'Control de radio',
        'Operación del reporte de contactos por radio (módulo Control)'
      )
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description
    `);

    await client.query(`
      INSERT INTO permissions (code, name, module) VALUES
        ('radio_control.view', 'Ver control de radio', 'radio_control'),
        ('radio_control.edit', 'Registrar contactos de radio', 'radio_control'),
        ('notifications.view', 'Ver notificaciones', 'notifications'),
        ('notifications.read', 'Marcar notificaciones como leídas', 'notifications')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = $1
        AND p.code = ANY($2::text[])
      ON CONFLICT DO NOTHING
    `,
      [ROLE_CODE, PERMS],
    );

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = $1 LIMIT 1`,
      [ROLE_CODE],
    );
    if (!role.rows[0]) throw new Error('No se resolvió el rol CONTROL');

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const upsert = await client.query<{ id: string; email: string }>(
      `
      INSERT INTO users (email, password_hash, full_name, role_id, is_active, tenant_id)
      VALUES ($1, $2, $3, $4, TRUE, $5)
      ON CONFLICT (tenant_id, email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            role_id = EXCLUDED.role_id,
            is_active = TRUE,
            updated_at = NOW()
      RETURNING id, email
    `,
      [EMAIL, passwordHash, FULL_NAME, role.rows[0].id, tenant],
    );

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = $1
      ORDER BY p.code
    `,
      [ROLE_CODE],
    );

    console.log('Usuario CONTROL listo');
    console.log(`  Email: ${upsert.rows[0].email}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log(`  Rol: ${ROLE_CODE}`);
    console.log(`  Permisos (${perms.rows.length}):`);
    for (const p of perms.rows) console.log(`    - ${p.code}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
