/**
 * seed-monitoreo.ts
 *
 * 1) Lista los usuarios que hoy tienen permisos de programación
 *    (scheduling.edit / scheduling.view) — para saber quién es el
 *    encargado del módulo (Jairo).
 * 2) Crea (o actualiza) el rol MONITOREO con permisos de solo lectura
 *    de programación (idempotente con 070_role_monitoreo.sql).
 * 3) Crea (o actualiza) un usuario `monitoreo@corazaseguridadcta.com`
 *    con clave conocida y ese rol.
 *
 * Uso local: npx ts-node apps/api/scripts/seed-monitoreo.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const MONITOREO_EMAIL = 'monitoreo@corazaseguridadcta.com';
const MONITOREO_PASSWORD = 'Monitoreo2026*';
const MONITOREO_FULLNAME = 'Monitoreo - Solo visualización';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  try {
    // ─── 1) ¿Quién está a cargo de programación? ────────────────────────
    console.log('\n📋 Usuarios con permisos de PROGRAMACIÓN (scheduling.*):');
    const encargados = await client.query<{
      email: string;
      full_name: string;
      role_code: string;
      role_name: string;
      permisos: string;
    }>(`
      SELECT
        u.email,
        u.full_name,
        r.code  AS role_code,
        r.name  AS role_name,
        string_agg(DISTINCT p.code, ', ' ORDER BY p.code) AS permisos
      FROM users u
      JOIN roles r ON r.id = u.role_id
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE u.is_active = TRUE
        AND p.code LIKE 'scheduling.%'
      GROUP BY u.email, u.full_name, r.code, r.name
      ORDER BY r.code, u.email;
    `);
    console.table(encargados.rows);

    // ─── 2) Rol MONITOREO + permisos (idempotente) ──────────────────────
    console.log('\n🔧 Asegurando rol MONITOREO...');
    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES ('MONITOREO', 'Monitoreo', 'Solo visualización de la programación mensual')
      ON CONFLICT (code) DO UPDATE
        SET name        = EXCLUDED.name,
            description = EXCLUDED.description;
    `);

    // Garantiza que los permisos existen
    await client.query(`
      INSERT INTO permissions (code, name, module) VALUES
        ('scheduling.view',    'Ver programación',       'scheduling'),
        ('notifications.view', 'Ver notificaciones',     'notifications'),
        ('notifications.read', 'Marcar como leídas',     'notifications')
      ON CONFLICT (code) DO NOTHING;
    `);

    console.log('🔧 Asignando permisos de solo lectura al rol MONITOREO...');
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.code = 'MONITOREO'
        AND p.code IN ('scheduling.view', 'notifications.view', 'notifications.read')
      ON CONFLICT DO NOTHING;
    `);

    const roleRow = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'MONITOREO' LIMIT 1`,
    );
    const roleId = roleRow.rows[0].id;

    // ─── 3) Usuario monitoreo ───────────────────────────────────────────
    console.log('\n👤 Creando/actualizando usuario de monitoreo...');
    const passwordHash = await bcrypt.hash(MONITOREO_PASSWORD, 12);

    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [MONITOREO_EMAIL],
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users
           SET password_hash = $1,
               full_name     = $2,
               role_id       = $3,
               is_active     = TRUE
         WHERE email = $4`,
        [passwordHash, MONITOREO_FULLNAME, roleId, MONITOREO_EMAIL],
      );
      console.log('   ✔ Usuario existente actualizado.');
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [MONITOREO_EMAIL, passwordHash, MONITOREO_FULLNAME, roleId],
      );
      console.log('   ✔ Usuario creado.');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(' CREDENCIALES DE MONITOREO (solo visualización)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Email:    ${MONITOREO_EMAIL}`);
    console.log(`   Password: ${MONITOREO_PASSWORD}`);
    console.log(`   Rol:      MONITOREO (scheduling.view)`);
    console.log('═══════════════════════════════════════════════════════\n');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
