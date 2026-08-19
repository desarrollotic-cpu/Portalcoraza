/**
 * Smoke de demo (SOLO LECTURA por defecto).
 * No modifica usuarios, roles, asociados, stock ni programaciones.
 *
 * Uso:
 *   1) npm run api:dev
 *   2) npm run test:demo -w @coraza/api
 *
 * Env:
 *   API_BASE_URL=http://localhost:3000/api/v1
 *   DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD (default seed admin)
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

type Check = { name: string; ok: boolean; ms: number; detail?: string };

const API = (process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
const EMAIL = (
  process.env.DEMO_LOGIN_EMAIL ??
  process.env.SEED_ADMIN_EMAIL ??
  'admin@corazaseguridadcta.com'
).toLowerCase();
const PASSWORD =
  process.env.DEMO_LOGIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'Coraza2026!';

const results: Check[] = [];

async function check(name: string, fn: () => Promise<string | void>): Promise<void> {
  const t0 = Date.now();
  try {
    const detail = (await fn()) ?? undefined;
    results.push({ name, ok: true, ms: Date.now() - t0, detail });
    console.log(`PASS  ${name}  (${Date.now() - t0} ms)${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ name, ok: false, ms: Date.now() - t0, detail: msg });
    console.error(`FAIL  ${name}  (${Date.now() - t0} ms) — ${msg}`);
  }
}

async function api(
  method: string,
  pathName: string,
  opts: { token?: string; body?: unknown; expectStatus?: number | number[] } = {},
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  const expected = opts.expectStatus ?? (method === 'POST' ? [200, 201] : [200]);
  const okList = Array.isArray(expected) ? expected : [expected];
  if (!okList.includes(res.status)) {
    throw new Error(`HTTP ${res.status} (esperaba ${okList.join('|')}): ${text.slice(0, 180)}`);
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\nDemo smoke (READ-ONLY) → ${API}`);
  console.log('No se escriben datos de negocio.\n');

  let token = '';
  let sampleDoc = '';

  await check('API reachable', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@invalid.local', password: 'wrong' }),
    });
    if (res.status >= 500) throw new Error(`API caída HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });

  await check('Login OK', async () => {
    const { json } = await api('POST', '/auth/login', {
      body: { email: EMAIL, password: PASSWORD },
    });
    token = json.accessToken ?? json.access_token ?? json.token;
    if (!token) throw new Error('Sin accessToken en respuesta');
    return `user=${json.user?.email ?? EMAIL}`;
  });

  await check('Login rechaza clave mala', async () => {
    await api('POST', '/auth/login', {
      body: { email: EMAIL, password: 'clave-incorrecta-demo' },
      expectStatus: 401,
    });
  });

  await check('RRHH listado asociados', async () => {
    const { json } = await api('GET', '/associates?page=1&limit=50', { token });
    const total = json.total ?? json.items?.length ?? 0;
    const items = json.items ?? json;
    if (!Array.isArray(items) || items.length < 1) throw new Error('Lista vacía');
    if (Number(total) < 1) throw new Error('total < 1');
    sampleDoc = String(items[0]?.documentNumber ?? '').replace(/\D/g, '');
    return `items=${items.length} total=${total}`;
  });

  await check('Dotación warehouses', async () => {
    const { json } = await api('GET', '/inventory/warehouses', { token });
    const rows = Array.isArray(json) ? json : json.items ?? [];
    if (rows.length < 2) throw new Error(`Se esperaban ≥2 almacenes, hay ${rows.length}`);
    return rows.map((w: any) => w.code ?? w.name).join(',');
  });

  await check('Dotación overview', async () => {
    const { json } = await api('GET', '/deliveries/overview', { token });
    if (json == null || typeof json !== 'object') throw new Error('Sin overview');
    return `pending=${json.pendingDeliveries ?? '?'} lowStock=${json.lowStockCount ?? '?'}`;
  });

  await check('Programación agosto (≥8) vía API', async () => {
    const { json } = await api('GET', '/scheduling/monthly/by-month?year=2026&month=8', {
      token,
    });
    const rows = Array.isArray(json) ? json : [];
    if (rows.length < 8) throw new Error(`ago schedules=${rows.length}`);
    return `schedules=${rows.length}`;
  });

  await check('Programación mayo (≥200) vía BD lectura', async () => {
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
    try {
      await client.query('SET default_transaction_read_only = on');
      const r = await client.query(
        `SELECT COUNT(*)::int n FROM monthly_schedules WHERE year=2026 AND month=5`,
      );
      const n = r.rows[0].n;
      if (n < 200) throw new Error(`may schedules=${n}`);
      return `schedules=${n} (API by-month mayo es pesado; se valida en BD)`;
    } finally {
      await client.end();
    }
  });

  await check('Recepción visitantes dentro', async () => {
    const { json } = await api('GET', '/reception/visitors?insideOnly=true&limit=20', {
      token,
    });
    if (!Array.isArray(json)) throw new Error('Respuesta no es lista');
    return `inside=${json.length}`;
  });

  // Lookup: use sample associate doc from list; if empty, skip gracefully via DB read-only
  await check('Recepción lookup Asociado/Visitante', async () => {
    if (!sampleDoc) {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error('Sin documento de muestra ni DATABASE_URL');
      const client = new Client({
        connectionString: url,
        ssl:
          url.includes('supabase') || url.includes('pooler')
            ? { rejectUnauthorized: false }
            : undefined,
      });
      await client.connect();
      try {
        await client.query('SET default_transaction_read_only = on');
        const r = await client.query(
          `SELECT document_number FROM associates
           WHERE status IN ('ACTIVO','VACACIONES') AND document_number IS NOT NULL
           LIMIT 1`,
        );
        sampleDoc = String(r.rows[0]?.document_number ?? '').replace(/\D/g, '');
      } finally {
        await client.end();
      }
    }
    if (!sampleDoc) throw new Error('No hay cédula de asociado para lookup');
    const { json } = await api(
      'GET',
      `/reception/visitors/lookup-associate?document=${encodeURIComponent(sampleDoc)}`,
      { token },
    );
    if (json.isAssociate !== true) throw new Error(`Esperaba Asociado para ${sampleDoc}`);
    const fake = await api(
      'GET',
      `/reception/visitors/lookup-associate?document=99999999999`,
      { token },
    );
    if (fake.json.isAssociate !== false) throw new Error('Esperaba Visitante para cédula falsa');
    return `doc=${sampleDoc} → Asociado; fake → Visitante`;
  });

  await check('BD integridad (solo lectura)', async () => {
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
    try {
      await client.query('SET default_transaction_read_only = on');
      const r = await client.query(`
        SELECT
          (SELECT COUNT(*)::int FROM users) AS users,
          (SELECT COUNT(*)::int FROM roles) AS roles,
          (SELECT COUNT(*)::int FROM associates) AS associates,
          (SELECT COUNT(*)::int FROM posts) AS posts,
          (SELECT COUNT(*)::int FROM monthly_schedules WHERE year=2026 AND month=8) AS ago,
          (SELECT COUNT(*)::int FROM monthly_schedules WHERE year=2026 AND month=5) AS may,
          (SELECT COUNT(*)::int FROM inventory_warehouses) AS warehouses
      `);
      const row = r.rows[0];
      if (row.users < 1) throw new Error('users=0');
      if (row.associates < 100) throw new Error(`associates=${row.associates}`);
      if (row.posts < 200) throw new Error(`posts=${row.posts}`);
      if (row.ago < 8) throw new Error(`ago=${row.ago}`);
      if (row.may < 200) throw new Error(`may=${row.may}`);
      if (row.warehouses < 2) throw new Error(`warehouses=${row.warehouses}`);
      return `users=${row.users} roles=${row.roles} associates=${row.associates} posts=${row.posts} ago=${row.ago} may=${row.may}`;
    } finally {
      await client.end();
    }
  });

  const failed = results.filter((r) => !r.ok).length;
  const totalMs = results.reduce((s, r) => s + r.ms, 0);
  console.log(`\nResumen: ${results.length - failed}/${results.length} OK · ${totalMs} ms total`);
  if (failed) {
    console.log('Fallidos:', results.filter((r) => !r.ok).map((r) => r.name).join(', '));
    process.exit(1);
  }
  console.log('Listo para demo. Nada fue modificado.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
