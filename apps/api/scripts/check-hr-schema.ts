/**
 * Verifica que el esquema de Gestión Humana esté listo (módulo 010 + ausentismo 012).
 * Uso: npm run db:check-hr -w @coraza/api
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const REQUIRED_TABLES = [
  'job_positions',
  'work_centers',
  'catalog_values',
  'hr_alerts',
  'retirements',
  'associate_documents',
  'diagnosticos_cie10',
  'associate_absences',
] as const;

const REQUIRED_PERM_PREFIXES = [
  'hr_dashboard.',
  'associates.',
  'hr_alerts.',
  'retirements.',
  'absences.',
  'job_positions.',
  'work_centers.',
  'catalogs.',
  'hr_import.',
  'hr_audit.',
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL in apps/api/.env');
    console.error('Copia .env.example → .env y configura la contraseña de Supabase.');
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

  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [REQUIRED_TABLES],
  );
  const present = new Set(tables.rows.map((r) => r.table_name));
  const missingTables = REQUIRED_TABLES.filter((t) => !present.has(t));

  const associatesCols = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM information_schema.columns
     WHERE table_name = 'associates' AND table_schema = 'public'`,
  );

  const perms = await client.query<{ code: string }>(
    `SELECT code FROM permissions
     WHERE code LIKE ANY($1::text[])
     ORDER BY code`,
    [REQUIRED_PERM_PREFIXES.map((p) => `${p}%`)],
  );
  const permCodes = perms.rows.map((r) => r.code);
  const missingPermFamilies = REQUIRED_PERM_PREFIXES.filter(
    (prefix) => !permCodes.some((c) => c.startsWith(prefix)),
  );

  console.log('=== Gestión Humana — chequeo de esquema ===');
  console.log(
    'Tablas HR:',
    present.size ? [...present].join(', ') : '(ninguna)',
  );
  console.log('Columnas associates:', associatesCols.rows[0]?.n ?? '0');
  console.log('Permisos HR relacionados:', permCodes.length);

  if (missingTables.length) {
    console.log('\n❌ Faltan tablas:', missingTables.join(', '));
    console.log('   → npm run db:apply-hr -w @coraza/api');
    console.log('   → npm run db:apply-absences -w @coraza/api');
  }
  if (missingPermFamilies.length) {
    console.log('\n❌ Faltan familias de permisos:', missingPermFamilies.join(', '));
    console.log('   → npm run db:apply-hr -w @coraza/api  (seed 004)');
    console.log('   → npm run db:apply-absences -w @coraza/api');
    console.log('   → npm run seed:rrhh -w @coraza/api');
  }

  if (!missingTables.length && !missingPermFamilies.length) {
    console.log('\n✅ Esquema Gestión Humana listo (010 + 012 + permisos).');
  } else {
    process.exitCode = 1;
  }

  await client.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
