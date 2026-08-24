/**
 * Smoke: Redis embebido + Nest + POST motor-global (202) + poll hasta completed.
 * Uso (desde apps/api): npm run smoke:motor-bullmq
 *
 * Importante: REDIS_URL se setea ANTES de importar AppModule (BullMQ se registra al cargar el módulo).
 */
import { NestFactory } from '@nestjs/core';
import { RedisMemoryServer } from 'redis-memory-server';

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

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
    logger: ['error', 'warn', 'log'],
  });
  app.setGlobalPrefix('api/v1');
  await app.listen(0);
  const server = app.getHttpServer();
  const addr = server.address();
  const portHttp = typeof addr === 'object' && addr ? addr.port : 3000;
  const base = `http://127.0.0.1:${portHttp}/api/v1`;

  const email =
    process.env.SEED_ADMIN_EMAIL || 'admin@corazaseguridadcta.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Coraza2026!';
  const year = Number(process.env.MOTOR_SMOKE_YEAR || new Date().getFullYear());
  const month = Number(
    process.env.MOTOR_SMOKE_MONTH || new Date().getMonth() + 1,
  );
  const createMissing = process.env.MOTOR_SMOKE_CREATE_MISSING !== '0';

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

  const t0 = Date.now();
  const enqueueRes = await fetch(`${base}/scheduling/monthly/motor-global`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      year,
      month,
      tipoCiclo: '12x3',
      createMissing,
    }),
  });
  const enqueueMs = Date.now() - t0;
  const enqueueBody = await enqueueRes.json();
  console.log(`enqueue ${enqueueRes.status} in ${enqueueMs}ms`, enqueueBody);
  if (enqueueRes.status !== 202) {
    throw new Error(`expected 202 queued, got ${enqueueRes.status}`);
  }
  if (enqueueMs > 2000) {
    console.warn(`WARN: enqueue tardó ${enqueueMs}ms (>2s)`);
  }

  const jobId = enqueueBody.jobId as string;
  let last = '';
  for (let i = 0; i < 900; i++) {
    await sleep(2000);
    const stRes = await fetch(
      `${base}/scheduling/monthly/motor-jobs/${encodeURIComponent(jobId)}`,
      { headers },
    );
    const st = await stRes.json();
    const line = `${st.status} ${JSON.stringify(st.progress ?? null)}`;
    if (line !== last) {
      console.log(line);
      last = line;
    }
    if (st.status === 'completed') {
      console.log('RESULT', st.result);
      console.log(
        `OK smoke: enqueue=${enqueueMs}ms processed=${st.result?.processed} ok=${st.result?.ok} failed=${st.result?.failed}`,
      );
      await app.close();
      await redis.stop();
      return;
    }
    if (st.status === 'failed') {
      throw new Error(st.failedReason || 'job failed');
    }
  }
  throw new Error('timeout esperando job');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
