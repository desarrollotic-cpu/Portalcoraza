/**
 * Keep-alive de Supabase (plan free).
 * Ejecuta una consulta ligera para evitar pausa por inactividad.
 *
 * Uso local:
 *   npm run db:keepalive -w @coraza/api
 *
 * Uso programado (recomendado): GitHub Action `.github/workflows/keepalive-db.yml`
 * con el secret DATABASE_URL.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL (apps/api/.env o secret de GitHub Actions).');
    process.exit(1);
  }

  const started = Date.now();
  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 20_000,
  });

  try {
    await client.connect();
    const result = await client.query<{
      ok: number;
      now: Date;
      db: string;
    }>(
      `SELECT 1 AS ok, NOW() AS now, current_database() AS db`,
    );

    const row = result.rows[0];
    const ms = Date.now() - started;
    console.log(
      `[keepalive] OK db=${row.db} at=${row.now.toISOString()} (${ms}ms)`,
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error('[keepalive] FAIL', err instanceof Error ? err.message : err);
  process.exit(1);
});
