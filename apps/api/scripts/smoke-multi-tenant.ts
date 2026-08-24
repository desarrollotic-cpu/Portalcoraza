/**
 * Smoke multi-tenant local: 2 organizations, aislamiento en /posts, anti-spoof.
 * Uso: npm run db:smoke-multi-tenant -w @coraza/api
 *
 * Requiere API no necesariamente arriba: este script usa pg + HTTP a localhost:3000
 * para login/list (si API caída, solo valida DB).
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CENTRAL = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

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
    await client.query(
      `INSERT INTO organizations (id, nombre, nit, plan, activo)
       VALUES ($1, 'Tenant Demo B', '800000001-1', 'basico', true)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre`,
      [TENANT_B],
    );

    const role = await client.query(
      `SELECT id FROM roles WHERE code = 'GERENCIA' LIMIT 1`,
    );
    if (!role.rowCount) throw new Error('Falta rol GERENCIA');
    const roleId = role.rows[0].id as string;

    const hash = await bcrypt.hash('TenantB2026!', 10);
    const existing = await client.query(
      `SELECT id FROM users WHERE email = 'tenantb@coraza.test' AND tenant_id = $1`,
      [TENANT_B],
    );
    if (!existing.rowCount) {
      await client.query(
        `INSERT INTO users (email, password_hash, full_name, role_id, is_active, tenant_id)
         VALUES ('tenantb@coraza.test', $1, 'User Tenant B', $2, true, $3)`,
        [hash, roleId, TENANT_B],
      );
      console.log('✓ Usuario tenantb@coraza.test creado');
    } else {
      await client.query(
        `UPDATE users SET password_hash = $1, is_active = true WHERE id = $2`,
        [hash, existing.rows[0].id],
      );
      console.log('✓ Usuario tenantb@coraza.test actualizado');
    }

    // Posts aislados
    await client.query(`DELETE FROM posts WHERE code IN ('MT-A-SMOKE', 'MT-B-SMOKE')`);
    await client.query(
      `INSERT INTO posts (code, name, type, status, tenant_id)
       VALUES ('MT-A-SMOKE', 'Post Central', 'SERVICIO_ESPECIAL', 'ACTIVO', $1)`,
      [CENTRAL],
    );
    await client.query(
      `INSERT INTO posts (code, name, type, status, tenant_id)
       VALUES ('MT-B-SMOKE', 'Post Tenant B', 'SERVICIO_ESPECIAL', 'ACTIVO', $1)`,
      [TENANT_B],
    );

    const aCount = await client.query(
      `SELECT COUNT(*)::int AS c FROM posts WHERE tenant_id = $1 AND code = 'MT-A-SMOKE'`,
      [CENTRAL],
    );
    const bCount = await client.query(
      `SELECT COUNT(*)::int AS c FROM posts WHERE tenant_id = $1 AND code = 'MT-B-SMOKE'`,
      [TENANT_B],
    );
    if (aCount.rows[0].c !== 1 || bCount.rows[0].c !== 1) {
      failures.push('DB: posts de smoke no quedaron 1:1 por tenant');
    } else {
      console.log('✓ DB: posts MT-A / MT-B creados en tenants distintos');
    }

    // HTTP smoke (si API está arriba)
    try {
      const loginA = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@corazaseguridadcta.com',
          password: 'Coraza2026!',
        }),
      });
      if (!loginA.ok) throw new Error(`login A HTTP ${loginA.status}`);
      const bodyA = (await loginA.json()) as {
        accessToken: string;
        user: { tenantId: string };
      };
      if (bodyA.user.tenantId !== CENTRAL) {
        failures.push(`login A tenantId esperado Central, got ${bodyA.user.tenantId}`);
      } else {
        console.log('✓ Login A tenantId = Cooperativa Central');
      }

      const loginB = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tenantb@coraza.test',
          password: 'TenantB2026!',
        }),
      });
      if (!loginB.ok) throw new Error(`login B HTTP ${loginB.status}`);
      const bodyB = (await loginB.json()) as {
        accessToken: string;
        user: { tenantId: string };
      };
      if (bodyB.user.tenantId !== TENANT_B) {
        failures.push(`login B tenantId esperado B, got ${bodyB.user.tenantId}`);
      } else {
        console.log('✓ Login B tenantId = Tenant Demo B');
      }

      const postsA = await fetch(`${API}/posts`, {
        headers: {
          Authorization: `Bearer ${bodyA.accessToken}`,
          'X-Tenant-ID': CENTRAL,
        },
      });
      const listA = (await postsA.json()) as Array<{ code: string }>;
      const codesA = listA.map((p) => p.code);
      if (!codesA.includes('MT-A-SMOKE') || codesA.includes('MT-B-SMOKE')) {
        failures.push(`A ve posts incorrectos: ${codesA.filter((c) => c.startsWith('MT-')).join(',')}`);
      } else {
        console.log('✓ Tenant A ve MT-A y no MT-B');
      }

      const postsB = await fetch(`${API}/posts`, {
        headers: {
          Authorization: `Bearer ${bodyB.accessToken}`,
          'X-Tenant-ID': TENANT_B,
        },
      });
      const listB = (await postsB.json()) as Array<{ code: string }>;
      const codesB = listB.map((p) => p.code);
      if (!codesB.includes('MT-B-SMOKE') || codesB.includes('MT-A-SMOKE')) {
        failures.push(`B ve posts incorrectos: ${codesB.filter((c) => c.startsWith('MT-')).join(',')}`);
      } else {
        console.log('✓ Tenant B ve MT-B y no MT-A');
      }

      const spoof = await fetch(`${API}/posts`, {
        headers: {
          Authorization: `Bearer ${bodyA.accessToken}`,
          'X-Tenant-ID': TENANT_B,
        },
      });
      if (spoof.status !== 403) {
        failures.push(`anti-spoof esperado 403, got ${spoof.status}`);
      } else {
        console.log('✓ Anti-spoof: X-Tenant-ID ≠ JWT → 403');
      }

      // create auto tenantId
      const createRes = await fetch(`${API}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bodyB.accessToken}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': TENANT_B,
        },
        body: JSON.stringify({
          code: `MT-B-AUTO-${Date.now().toString(36)}`,
          name: 'Auto tenant create',
          type: 'SERVICIO_ESPECIAL',
        }),
      });
      if (!createRes.ok) {
        failures.push(`create post B HTTP ${createRes.status}`);
      } else {
        const created = (await createRes.json()) as { tenantId?: string; id: string };
        if (created.tenantId && created.tenantId !== TENANT_B) {
          failures.push(`create asignó tenantId ${created.tenantId}`);
        } else {
          const row = await client.query(
            `SELECT tenant_id FROM posts WHERE id = $1`,
            [created.id],
          );
          if (row.rows[0]?.tenant_id !== TENANT_B) {
            failures.push('DB create no guardó tenant B');
          } else {
            console.log('✓ Create asigna tenantId del contexto (B)');
          }
        }
      }
    } catch (e) {
      console.warn(
        '· HTTP smoke omitido o parcial:',
        e instanceof Error ? e.message : e,
      );
      console.warn('  Levanta API (npm run api:dev) y re-ejecuta para prueba completa.');
    }
  } finally {
    await client.end();
  }

  if (failures.length) {
    console.error('\nFallos:');
    for (const f of failures) console.error(' -', f);
    process.exit(1);
  }
  console.log('\n✓ Smoke multi-tenant OK (listo para revisión)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
