import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const email = 'documental@corazaseguridadcta.com';
const password = 'Documental2026*';
const fullName = 'Gestión Documental';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { throw new Error('Missing DATABASE_URL'); }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    // 1. Crear rol DOCUMENTAL
    console.log('Creando rol DOCUMENTAL...');
    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES ('DOCUMENTAL', 'Gestión Documental', 'Acceso al módulo de Gestión Documental, Archivo y Correspondencia')
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description;
    `);

    // 2. Asignar permisos documental.* al rol
    console.log('Asignando permisos documental.* al rol...');
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.code = 'DOCUMENTAL'
        AND (
          p.code LIKE 'documental.%'
          OR p.code IN (
            'notifications.view',
            'notifications.read'
          )
        )
      ON CONFLICT DO NOTHING;
    `);

    const permsResult = await client.query<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      WHERE r.code = 'DOCUMENTAL'
    `);
    console.log(`  Permisos asignados: ${permsResult.rows[0].count}`);

    // 3. Obtener id del rol DOCUMENTAL
    const role = await client.query<{ id: string }>(`SELECT id FROM roles WHERE code = 'DOCUMENTAL' LIMIT 1`);
    const roleId = role.rows[0].id;

    // 4. Crear o actualizar usuario
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET password_hash = $1, full_name = $2, role_id = $3, is_active = TRUE WHERE email = $4`,
        [passwordHash, fullName, roleId, email]
      );
      console.log('\nUsuario actualizado correctamente.');
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role_id, is_active) VALUES ($1, $2, $3, $4, TRUE)`,
        [email, passwordHash, fullName, roleId]
      );
      console.log('\nUsuario creado correctamente.');
    }

    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol:      DOCUMENTAL`);

  } finally {
    await client.end();
  }
}

main().catch(console.error);
