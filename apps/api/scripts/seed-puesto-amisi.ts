/**
 * Rol PUESTO + usuario de ejemplo Amisi ligado a su puesto (Minuta Virtual).
 * Uso: npx ts-node scripts/seed-puesto-amisi.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const email = (process.env.SEED_PUESTO_EMAIL ?? 'amisi@corazaseguridadcta.com').toLowerCase();
const password = process.env.SEED_PUESTO_PASSWORD ?? 'Amisi2026!';
const fullName = process.env.SEED_PUESTO_NAME ?? 'Puesto Amisi';
const postNeedle = (process.env.SEED_PUESTO_POST ?? 'amisi').toLowerCase();

const PUESTO_PERMISSIONS = ['minuta.view', 'minuta.create', 'notifications.view', 'notifications.read'];

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
      VALUES ('PUESTO', 'Puesto', 'Minuta virtual del puesto asignado')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(`
      INSERT INTO permissions (code, name, module) VALUES
        ('minuta.view', 'Ver minuta virtual', 'minuta'),
        ('minuta.create', 'Crear registros en minuta virtual', 'minuta'),
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
      WHERE r.code = 'PUESTO'
        AND p.code = ANY($1::text[])
      ON CONFLICT DO NOTHING
    `,
      [PUESTO_PERMISSIONS],
    );

    // Gerencia también recibe minuta.create si faltaba
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'GERENCIA'
        AND p.code IN ('minuta.view', 'minuta.create')
      ON CONFLICT DO NOTHING
    `);

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'PUESTO' LIMIT 1`,
    );
    if (!role.rows[0]) throw new Error('No se pudo resolver el rol PUESTO');

    const posts = await client.query<{ id: string; name: string; code: string }>(
      `
      SELECT id, name, code
      FROM posts
      WHERE lower(name) LIKE $1 OR lower(code) LIKE $1
      ORDER BY name
      LIMIT 5
    `,
      [`%${postNeedle}%`],
    );
    if (!posts.rows[0]) {
      throw new Error(`No hay puesto que coincida con "${postNeedle}"`);
    }
    const post = posts.rows[0];
    if (posts.rows.length > 1) {
      console.log('Puestos candidatos (se usa el primero):');
      for (const p of posts.rows) console.log(`  - ${p.code} | ${p.name}`);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const upsert = await client.query<{ id: string; email: string }>(
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

    const userId = upsert.rows[0].id;
    await client.query(
      `
      INSERT INTO user_posts (user_id, post_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
      [userId, post.id],
    );

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'PUESTO'
      ORDER BY p.code
    `,
    );

    console.log('Usuario PUESTO listo');
    console.log(`  Email: ${upsert.rows[0].email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol: PUESTO`);
    console.log(`  Puesto: ${post.code} | ${post.name} (${post.id})`);
    console.log(`  Permisos (${perms.rows.length}):`);
    for (const p of perms.rows) console.log(`    - ${p.code}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
