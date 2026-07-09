/**
 * Aplica migración 010 (módulo HRM) + seed 004 (permisos, catálogos, cargos).
 *
 * ⚠️ 010 hace TRUNCATE de associates y tablas relacionadas (entregas, programación).
 *
 * Uso: npm run db:apply-hr -w @coraza/api
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runSqlFile(client: Client, filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);
  console.log(`→ ${name}...`);
  await client.query(sql);
  console.log(`  ✓ ${name}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ Falta DATABASE_URL en apps/api/.env');
    process.exit(1);
  }

  const root = path.join(__dirname, '..', '..', '..');
  const migration = path.join(root, 'supabase', 'migrations', '010_hr_module.sql');
  const seed = path.join(root, 'supabase', 'seed', '004_hr_module.sql');

  for (const f of [migration, seed]) {
    if (!fs.existsSync(f)) {
      console.error(`❌ No existe: ${f}`);
      process.exit(1);
    }
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Conectando a Supabase...');
    await client.connect();
    console.log('✓ Conectado\n');
    console.log('⚠️  Migración destructiva: vacía associates, entregas y programación.\n');

    await runSqlFile(client, migration);
    await runSqlFile(client, seed);

    const check = await client.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM job_positions`,
    );
    console.log(`\n✅ Módulo HRM aplicado. Cargos seed: ${check.rows[0]?.n ?? '0'}`);
    console.log('\nReinicia sesión (logout/login) para cargar permisos HR nuevos.');
  } catch (err: unknown) {
    console.error('\n❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
