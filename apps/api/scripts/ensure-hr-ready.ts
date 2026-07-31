/**
 * Asegura esquema Gestión Humana: 010 (si falta) + seed 004 + 012 ausentismo.
 * No migra datos de producción; solo deja tablas/permisos listos.
 *
 * Uso: npm run db:ensure-hr -w @coraza/api
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function tableExists(client: Client, name: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [name],
  );
  return r.rowCount !== null && r.rowCount > 0;
}

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
  const files = {
    hr: path.join(root, 'supabase', 'migrations', '010_hr_module.sql'),
    seed: path.join(root, 'supabase', 'seed', '004_hr_module.sql'),
    absences: path.join(root, 'supabase', 'migrations', '012_hr_absenteeism.sql'),
  };

  for (const f of Object.values(files)) {
    if (!fs.existsSync(f)) {
      console.error(`❌ No existe: ${f}`);
      process.exit(1);
    }
  }

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  console.log('✓ Conectado\n');

  try {
    const hasJobs = await tableExists(client, 'job_positions');
    const hasAbsences = await tableExists(client, 'associate_absences');

    if (!hasJobs) {
      console.log(
        '⚠️  Aplicando 010_hr_module.sql (destructivo sobre associates si ya existían).\n',
      );
      await runSqlFile(client, files.hr);
      await runSqlFile(client, files.seed);
    } else {
      console.log('ℹ job_positions ya existe — se omite 010 (evitar TRUNCATE).');
      console.log('  Si necesitas re-sembrar catálogos: npm run db:apply-hr -w @coraza/api');
      // Reaplicar seed 004 es idempotente (ON CONFLICT) en la mayoría de inserts.
      await runSqlFile(client, files.seed);
    }

    if (!hasAbsences) {
      await runSqlFile(client, files.absences);
    } else {
      console.log('ℹ associate_absences ya existe — se omite 012.');
    }

    console.log(`
✅ Gestión Humana lista a nivel esquema.

Siguiente:
  npm run db:check-hr -w @coraza/api
  npm run seed:rrhh -w @coraza/api   (usuario RRHH de prueba, opcional)
  Reinicia sesión (logout/login) para refrescar permisos JWT.
`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
