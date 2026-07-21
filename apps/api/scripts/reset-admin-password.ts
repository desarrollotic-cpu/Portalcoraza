/**
 * Restablece la contraseña del administrador (GERENCIA).
 *
 * Uso:
 *   SEED_ADMIN_PASSWORD="NuevaClave123!" npm run reset:admin-password
 *
 * Opcional:
 *   SEED_ADMIN_EMAIL=admin@corazaseguridadcta.com
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../src/modules/roles/entities/role.entity';
import { User } from '../src/modules/users/entities/user.entity';

const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@corazaseguridadcta.com').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD ?? 'Coraza2026!';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL en apps/api/.env');
  }

  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Role, User],
    ssl:
      process.env.DATABASE_URL.includes('supabase') ||
      process.env.DATABASE_URL.includes('pooler')
        ? { rejectUnauthorized: false }
        : false,
  });

  await ds.initialize();
  const roles = ds.getRepository(Role);
  const users = ds.getRepository(User);

  const role = await roles.findOne({ where: { code: 'GERENCIA' } });
  if (!role) {
    throw new Error('No existe el rol GERENCIA. Ejecuta los seeds primero.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user = await users.findOne({ where: { email } });

  if (!user) {
    user = await users.save(
      users.create({
        email,
        passwordHash,
        fullName: 'Administrador System Coraza',
        roleId: role.id,
        isActive: true,
      }),
    );
    console.log(`Admin creado: ${email}`);
  } else {
    user.passwordHash = passwordHash;
    user.roleId = role.id;
    user.isActive = true;
    await users.save(user);
    console.log(`Contraseña restablecida para: ${email}`);
  }

  console.log(`Nueva contraseña: ${password}`);
  console.log('Inicia sesión y cámbiala desde el menú de usuario.');
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
