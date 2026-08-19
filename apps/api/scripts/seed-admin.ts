/**
 * Crea usuario administrador inicial (rol GERENCIA).
 * Uso: npx ts-node scripts/seed-admin.ts
 * Requiere DATABASE_URL en .env
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Permission } from '../src/modules/permissions/entities/permission.entity';
import { RolePermission } from '../src/modules/roles/entities/role-permission.entity';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User } from '../src/modules/users/entities/user.entity';

const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@corazaseguridadcta.com';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'Coraza2026!';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Role, User, RolePermission, Permission],
    ssl: (process.env.DATABASE_URL?.includes('supabase') || process.env.DATABASE_URL?.includes('pooler'))
      ? { rejectUnauthorized: false }
      : false,
  });

  await ds.initialize();
  const roles = ds.getRepository(Role);
  const users = ds.getRepository(User);

  const role = await roles.findOne({ where: { code: 'GERENCIA' } });
  if (!role) {
    throw new Error('Ejecuta primero supabase/seed/001_roles_permissions.sql');
  }

  // Siempre re-sincroniza: permisos nuevos (inventario, etc.) no quedan fuera de Gerencia.
  const sync = await ds.query(
    `
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code = 'GERENCIA'
    ON CONFLICT DO NOTHING
    RETURNING permission_id
    `,
  );
  console.log(`GERENCIA: +${sync.length} permisos sincronizados (todos los del catálogo)`);

  const existing = await users.findOne({ where: { email } });
  if (existing) {
    console.log(`Usuario ya existe: ${email}`);
    await ds.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await users.save(
    users.create({
      email,
      passwordHash,
      fullName: 'Administrador System Coraza',
      roleId: role.id,
      isActive: true,
    }),
  );

  console.log(`Usuario creado: ${email}`);
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
