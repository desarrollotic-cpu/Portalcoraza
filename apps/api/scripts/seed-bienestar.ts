/**
 * Usuario Bienestar: solo lectura de Personal (Gestión Humana).
 * Uso: npx ts-node scripts/seed-bienestar.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { Client } from 'pg';

const email = (process.env.SEED_BIENESTAR_EMAIL ?? 'bienestar@corazaseguridadcta.com').toLowerCase();
const password = process.env.SEED_BIENESTAR_PASSWORD ?? 'Bienestar2026*';
const fullName = process.env.SEED_BIENESTAR_NAME ?? 'Bienestar Coraza';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL en apps/api/.env');

  const sql = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '059_bienestar_rrhh_personal_view.sql'),
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

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'BIENESTAR' LIMIT 1`,
    );
    if (!role.rows[0]) throw new Error('No se pudo resolver el rol BIENESTAR');

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
      `SELECT p.code
       FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE r.code = 'BIENESTAR'
       ORDER BY p.code`,
    );

    const writes = perms.rows.filter((p) => p.code !== 'associates.view');
    if (writes.length) {
      throw new Error('BIENESTAR no debe tener más permisos: ' + writes.map((p) => p.code).join(', '));
    }

    console.log('Usuario BIENESTAR listo');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol: BIENESTAR`);
    console.log(`  Permisos: ${perms.rows.map((p) => p.code).join(', ') || '(ninguno)'}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
