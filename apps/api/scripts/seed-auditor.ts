/**
 * Crea (o actualiza) el usuario Auditor: recorre todos los módulos en solo lectura.
 *
 * Uso: npm run seed:auditor -w @coraza/api
 *
 * Variables opcionales:
 *   SEED_AUDITOR_EMAIL / SEED_AUDITOR_PASSWORD / SEED_AUDITOR_NAME
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const email = (process.env.SEED_AUDITOR_EMAIL ?? 'auditor@corazaseguridadcta.com').toLowerCase();
const password = process.env.SEED_AUDITOR_PASSWORD ?? 'Auditor2026!';
const fullName = process.env.SEED_AUDITOR_NAME ?? 'Auditor Portal Coraza';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL en apps/api/.env');
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
    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES (
        'AUDITOR',
        'Auditor',
        'Consulta de todos los módulos del portal sin capacidad de modificación'
      )
      ON CONFLICT (code) DO NOTHING
    `);

    // Asigna solo lectura; limpia permisos de escritura si el rol ya existía con extras.
    await client.query(`
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.code = 'AUDITOR'
        AND NOT (
          p.code LIKE '%.view'
          OR p.code IN ('inventory.alerts', 'hr_export.excel')
        )
    `);

    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'AUDITOR'
        AND (
          p.code LIKE '%.view'
          OR p.code IN ('inventory.alerts', 'hr_export.excel')
        )
      ON CONFLICT DO NOTHING
    `);

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'AUDITOR' LIMIT 1`,
    );
    if (!role.rows[0]) {
      throw new Error('No se pudo resolver el rol AUDITOR');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const upsert = await client.query(
      `
      INSERT INTO users (email, password_hash, full_name, role_id, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            role_id = EXCLUDED.role_id,
            is_active = TRUE,
            updated_at = NOW()
      RETURNING id, email
    `,
      [email, passwordHash, fullName, role.rows[0].id],
    );

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'AUDITOR'
      ORDER BY p.code
    `,
    );

    const writeLike = perms.rows.filter(
      (p) =>
        !p.code.endsWith('.view') &&
        p.code !== 'inventory.alerts' &&
        p.code !== 'hr_export.excel',
    );
    if (writeLike.length > 0) {
      throw new Error(
        `AUDITOR tiene permisos de escritura inesperados: ${writeLike.map((p) => p.code).join(', ')}`,
      );
    }

    console.log('Usuario AUDITOR listo (solo lectura)');
    console.log(`  Email: ${upsert.rows[0].email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol: AUDITOR`);
    console.log(`  Permisos (${perms.rows.length}):`);
    for (const p of perms.rows) {
      console.log(`    - ${p.code}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
