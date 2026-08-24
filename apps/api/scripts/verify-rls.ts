/**
 * Prueba aislamiento RLS a nivel PostgreSQL (SET ROLE coraza_app + app.tenant_id).
 * Uso: npm run db:verify-rls -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CENTRAL = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

const GLOBALS = [
  'roles',
  'permissions',
  'role_permissions',
  'diagnosticos_cie10',
  'organizations',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL');

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  const failures: string[] = [];

  try {
    // Asegurar org B + posts de smoke
    await client.query(
      `INSERT INTO organizations (id, nombre, nit, plan, activo)
       VALUES ($1, 'Tenant Demo B', '800000001-1', 'basico', true)
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_B],
    );
    await client.query(`DELETE FROM posts WHERE code IN ('RLS-A', 'RLS-B')`);
    await client.query(
      `INSERT INTO posts (code, name, type, status, tenant_id)
       VALUES ('RLS-A', 'RLS Central', 'SERVICIO_ESPECIAL', 'ACTIVO', $1)`,
      [CENTRAL],
    );
    await client.query(
      `INSERT INTO posts (code, name, type, status, tenant_id)
       VALUES ('RLS-B', 'RLS Tenant B', 'SERVICIO_ESPECIAL', 'ACTIVO', $1)`,
      [TENANT_B],
    );

    // Globales: no deben tener RLS forzado
    for (const t of GLOBALS) {
      const r = await client.query(
        `SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS force
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = $1`,
        [t],
      );
      if (!r.rowCount) {
        console.log(`· skip global ausente: ${t}`);
        continue;
      }
      if (r.rows[0].rls || r.rows[0].force) {
        failures.push(`Global ${t} no debería tener RLS (rls=${r.rows[0].rls} force=${r.rows[0].force})`);
      } else {
        console.log(`✓ Global sin RLS: ${t}`);
      }
    }

    // posts debe tener FORCE RLS
    const postsRls = await client.query(
      `SELECT c.relrowsecurity AS rls, c.relforcerowsecurity AS force
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'posts'`,
    );
    if (!postsRls.rows[0]?.force) {
      failures.push('posts no tiene FORCE ROW LEVEL SECURITY');
    } else {
      console.log('✓ posts FORCE RLS activo');
    }

    // Aislamiento como coraza_app
    await client.query('BEGIN');
    try {
      await client.query('SET LOCAL ROLE coraza_app');
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [CENTRAL]);
      const a = await client.query(
        `SELECT code FROM posts WHERE code IN ('RLS-A', 'RLS-B') ORDER BY code`,
      );
      const codesA = a.rows.map((r) => r.code as string);
      if (codesA.join(',') !== 'RLS-A') {
        failures.push(`tenant A via RLS vio: [${codesA.join(',')}]`);
      } else {
        console.log('✓ RLS tenant A solo ve RLS-A');
      }

      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [TENANT_B]);
      const b = await client.query(
        `SELECT code FROM posts WHERE code IN ('RLS-A', 'RLS-B') ORDER BY code`,
      );
      const codesB = b.rows.map((r) => r.code as string);
      if (codesB.join(',') !== 'RLS-B') {
        failures.push(`tenant B via RLS vio: [${codesB.join(',')}]`);
      } else {
        console.log('✓ RLS tenant B solo ve RLS-B');
      }

      // Sin tenant_id → 0 filas
      await client.query(`SELECT set_config('app.tenant_id', '', true)`);
      const empty = await client.query(
        `SELECT COUNT(*)::int AS c FROM posts WHERE code IN ('RLS-A', 'RLS-B')`,
      );
      if (empty.rows[0].c !== 0) {
        failures.push('sin app.tenant_id aún ve filas (fail-open)');
      } else {
        console.log('✓ Sin app.tenant_id → 0 filas (fail-closed)');
      }

      // Globales siguen visibles bajo coraza_app
      const roles = await client.query(`SELECT COUNT(*)::int AS c FROM roles`);
      if (roles.rows[0].c < 1) {
        failures.push('roles no visible bajo coraza_app');
      } else {
        console.log('✓ Tabla global roles accesible bajo coraza_app');
      }
    } finally {
      await client.query('ROLLBACK');
    }
  } finally {
    await client.end();
  }

  if (failures.length) {
    console.error('\nFallos RLS:');
    for (const f of failures) console.error(' -', f);
    process.exit(1);
  }
  console.log('\n✓ Verificación RLS OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
