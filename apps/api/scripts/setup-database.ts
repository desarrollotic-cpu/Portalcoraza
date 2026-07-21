/**
 * Ejecuta migraciones + seeds + usuario admin en Supabase.
 * Requiere DATABASE_URL válido en apps/api/.env
 *
 * Uso: npm run db:setup -w @coraza/api
 */
import * as bcrypt from 'bcrypt';
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const PLACEHOLDERS = [
  'REEMPLAZA_TU_PASSWORD',
  '[YOUR-PASSWORD]',
  '[PASSWORD]',
];

async function runSqlFile(client: Client, filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);
  console.log(`→ Ejecutando ${name}...`);
  await client.query(sql);
  console.log(`  ✓ ${name}`);
}

async function seedAdmin(client: Client) {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@corazaseguridadcta.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Coraza2026!';

  const role = await client.query(
    `SELECT id FROM roles WHERE code = 'GERENCIA' LIMIT 1`,
  );
  if (!role.rows[0]) {
    throw new Error('Rol GERENCIA no encontrado. Ejecuta los seeds primero.');
  }

  const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [
    email,
  ]);
  if (existing.rows[0]) {
    console.log(`  ℹ Usuario ya existe: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await client.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [email, passwordHash, 'Administrador System Coraza', role.rows[0].id],
  );
  console.log(`  ✓ Admin creado: ${email} / ${password}`);
}

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ Falta DATABASE_URL en apps/api/.env');
    process.exit(1);
  }

  if (PLACEHOLDERS.some((p) => DATABASE_URL.includes(p))) {
    console.error(`
❌ La contraseña de Supabase NO está configurada.

Abre: apps/api/.env
Cambia REEMPLAZA_TU_PASSWORD por tu contraseña real de Supabase
(Database Settings → Database password)

Luego ejecuta de nuevo: npm run db:setup -w @coraza/api
`);
    process.exit(1);
  }

  const root = path.join(__dirname, '..', '..', '..');
  const files = [
    path.join(root, 'supabase', 'migrations', '001_core_schema.sql'),
    path.join(root, 'supabase', 'seed', '001_roles_permissions.sql'),
    path.join(root, 'supabase', 'seed', '002_gerencia_full_permissions.sql'),
  ];

  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`❌ No existe: ${f}`);
      process.exit(1);
    }
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Conectando a Supabase...');
    await client.connect();
    console.log('✓ Conectado\n');

    for (const f of files) {
      await runSqlFile(client, f);
    }

    console.log('\n→ Creando administrador...');
    await seedAdmin(client);

    console.log(`
✅ Base de datos lista.

Siguiente:
  npm run api:dev     (desde la raíz del proyecto)
  npm run web:dev

Login: admin@corazaseguridadcta.com / Coraza2026!
`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('already exists') || msg.includes('duplicate')) {
      console.log('\n⚠ Algunos objetos ya existían (normal si re-ejecutas).');
      console.log('Intentando crear admin...');
      try {
        await seedAdmin(client);
      } catch (e) {
        console.error(e);
      }
    } else {
      console.error('\n❌ Error:', msg);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main();
