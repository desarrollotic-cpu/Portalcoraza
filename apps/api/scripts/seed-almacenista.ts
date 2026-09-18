/**
 * Crea (o actualiza) el usuario operativo de Dotación con rol ALMACENISTA.
 * Uso: npx ts-node scripts/seed-almacenista.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const email = (process.env.SEED_ALMACENISTA_EMAIL ?? 'almacen@corazaseguridadcta.com').toLowerCase();
const password = process.env.SEED_ALMACENISTA_PASSWORD ?? 'Almacen2026!';
const fullName = process.env.SEED_ALMACENISTA_NAME ?? 'Almacenista Dotación';

const ALMACENISTA_PERMISSIONS = [
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.move',
  'inventory.alerts',
  'deliveries.view',
  'deliveries.create',
  'deliveries.sign',
  'deliveries.revert',
  'post_equipment.view',
  'post_equipment.assign',
  'post_equipment.return',
  'post_equipment.manage',
  'associates.view',
  'notifications.view',
  'notifications.read',
];

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
      VALUES ('ALMACENISTA', 'Almacenista', 'Dotación e inventario')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(`
      INSERT INTO permissions (code, name, module) VALUES
        ('inventory.view', 'Ver inventario', 'inventory'),
        ('inventory.create', 'Crear inventario', 'inventory'),
        ('inventory.edit', 'Editar inventario', 'inventory'),
        ('inventory.move', 'Registrar movimientos de inventario', 'inventory'),
        ('inventory.alerts', 'Ver alertas de inventario', 'inventory'),
        ('deliveries.view', 'Ver entregas', 'deliveries'),
        ('deliveries.create', 'Crear entrega', 'deliveries'),
        ('deliveries.sign', 'Confirmar entrega con firma', 'deliveries'),
        ('deliveries.revert', 'Revertir entrega confirmada', 'deliveries'),
        ('post_equipment.view', 'Ver elementos de puesto', 'dotacion'),
        ('post_equipment.assign', 'Asignar elementos a puesto', 'dotacion'),
        ('post_equipment.return', 'Registrar devolución de elementos de puesto', 'dotacion'),
        ('post_equipment.manage', 'Gestionar catálogo de elementos de puesto', 'dotacion'),
        ('associates.view', 'Consultar asociados', 'associates'),
        ('notifications.view', 'Ver notificaciones', 'notifications'),
        ('notifications.read', 'Marcar notificaciones como leidas', 'notifications')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'ALMACENISTA'
        AND p.code = ANY($1::text[])
      ON CONFLICT DO NOTHING
    `,
      [ALMACENISTA_PERMISSIONS],
    );

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'ALMACENISTA' LIMIT 1`,
    );
    if (!role.rows[0]) {
      throw new Error('No se pudo resolver el rol ALMACENISTA');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );

    if (existing.rows[0]) {
      await client.query(
        `UPDATE users
         SET password_hash = $1, full_name = $2, role_id = $3, is_active = TRUE, updated_at = NOW()
         WHERE id = $4`,
        [passwordHash, fullName, role.rows[0].id, existing.rows[0].id],
      );
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [email, passwordHash, fullName, role.rows[0].id],
      );
    }

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'ALMACENISTA'
      ORDER BY p.code
    `,
    );

    console.log('Usuario ALMACENISTA listo');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol: ALMACENISTA`);
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
