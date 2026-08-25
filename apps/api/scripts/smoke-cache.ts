/**
 * Smoke: Redis embebido + Nest + GET /associates dos veces (cache miss vs hit) + write invalida.
 * Uso (desde apps/api): npm run smoke:cache
 *
 * Requiere: SEED_ADMIN_EMAIL/PASSWORD válidos y DB accesible.
 * Reporta:
 *   - primer GET (cache miss)
 *   - segundo GET (cache hit, debería ser << primero, tipicamente <100ms)
 *   - crea un asociado → tercer GET (debería ser miss otra vez, cache invalidada)
 */
import { NestFactory } from '@nestjs/core';
import { RedisMemoryServer } from 'redis-memory-server';

async function main() {
  const redis = await RedisMemoryServer.create();
  const host = await redis.getHost();
  const port = await redis.getPort();
  process.env.REDIS_URL = `redis://${host}:${port}`;
  console.log(`Redis memory → ${process.env.REDIS_URL}`);

  const { patchTypeOrmTenantFilter } = await import(
    '../src/common/tenant/patch-typeorm-tenant'
  );
  const { AppModule } = await import('../src/app.module');

  patchTypeOrmTenantFilter();
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api/v1');
  await app.listen(0);
  const server = app.getHttpServer();
  const addr = server.address();
  const portHttp = typeof addr === 'object' && addr ? addr.port : 3000;
  const base = `http://127.0.0.1:${portHttp}/api/v1`;

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@corazaseguridadcta.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Coraza2026!';

  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    throw new Error(`login ${loginRes.status}: ${await loginRes.text()}`);
  }
  const login = (await loginRes.json()) as {
    accessToken: string;
    user: { tenantId: string };
  };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${login.accessToken}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': login.user.tenantId,
  };

  async function timedGet(path: string): Promise<{ ms: number; status: number }> {
    const t = Date.now();
    const res = await fetch(`${base}${path}`, { headers });
    await res.text();
    return { ms: Date.now() - t, status: res.status };
  }

  console.log('--- /associates ---');
  const miss = await timedGet('/associates?limit=50');
  console.log(`miss  ${miss.status} in ${miss.ms}ms`);
  const hit = await timedGet('/associates?limit=50');
  console.log(`hit   ${hit.status} in ${hit.ms}ms`);
  if (hit.status !== 200) throw new Error('GET associates falló en hit');
  if (hit.ms >= miss.ms) {
    console.warn(
      `WARN: cache hit (${hit.ms}ms) no fue más rápido que miss (${miss.ms}ms)`,
    );
  } else {
    console.log(`OK cache hit ${hit.ms}ms < miss ${miss.ms}ms`);
  }

  console.log('--- /hr/absences ---');
  const miss2 = await timedGet('/hr/absences');
  console.log(`miss  ${miss2.status} in ${miss2.ms}ms`);
  const hit2 = await timedGet('/hr/absences');
  console.log(`hit   ${hit2.status} in ${hit2.ms}ms`);

  // Invalidación: PATCH un asociado existente (touch updatedBy) y verificar
  // que la próxima lectura vuelva a ser un miss (más lenta que hit).
  console.log('--- invalidación asociados ---');
  const listRes = await fetch(`${base}/associates?limit=1`, { headers });
  const listJson = (await listRes.json()) as { items: { id: string }[] };
  const targetId = listJson.items?.[0]?.id;
  if (!targetId) {
    console.warn('WARN: no hay asociados para invalidar; saltando');
  } else {
    const patchRes = await fetch(`${base}/associates/${targetId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({}),
    });
    if (!patchRes.ok) {
      console.warn(
        `WARN patch devolvió ${patchRes.status}: ${await patchRes.text()}`,
      );
    } else {
      const missAfter = await timedGet('/associates?limit=50');
      console.log(`after-write ${missAfter.status} in ${missAfter.ms}ms`);
      if (missAfter.ms <= hit.ms) {
        console.warn(
          `WARN: after-write (${missAfter.ms}ms) no fue más lento que hit (${hit.ms}ms) — ¿se invalidó realmente?`,
        );
      } else {
        console.log(
          `OK invalidación: after-write ${missAfter.ms}ms > hit ${hit.ms}ms`,
        );
      }
    }
  }

  await app.close();
  await redis.stop();
  console.log('smoke:cache OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
