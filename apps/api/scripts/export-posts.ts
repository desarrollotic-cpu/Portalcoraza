/**
 * Solo lectura: exporta puestos ACTIVO a CSV para cruce con facturación.
 * Uso: npx ts-node --transpile-only scripts/export-posts.ts
 * No modifica datos. No hacer commit/push.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/** Tenant Cooperativa Central (default multi-tenant del portal). */
const DEFAULT_TENANT = '11111111-1111-1111-1111-111111111111';

const OUT =
  process.env.EXPORT_POSTS_OUT ||
  'C:\\Users\\jzapata\\Downloads\\puestos_portal_activos.csv';

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const s =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'object' && value !== null && 'toISOString' in value
        ? String((value as { toISOString: () => string }).toISOString())
        : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL en apps/api/.env');

  const tenantId =
    process.env.DEFAULT_TENANT_ID ||
    process.env.TENANT_ID ||
    DEFAULT_TENANT;

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 20000,
  });

  await client.connect();
  try {
    const result = await client.query(
      `
      SELECT
        code,
        name,
        nit,
        client_name,
        status,
        zone,
        service_type,
        created_at
      FROM posts
      WHERE status = 'ACTIVO'
        AND tenant_id = $1
      ORDER BY code ASC NULLS LAST, name ASC
      `,
      [tenantId],
    );

    const headers = [
      'code',
      'name',
      'nit',
      'client_name',
      'status',
      'zone',
      'service_type',
      'created_at',
    ] as const;

    const lines = [headers.join(',')];
    for (const row of result.rows) {
      lines.push(
        [
          row.code,
          row.name,
          row.nit,
          row.client_name,
          row.status,
          row.zone,
          row.service_type,
          row.created_at,
        ]
          .map(csvEscape)
          .join(','),
      );
    }

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    // BOM UTF-8 para que Excel abra bien tildes/ñ
    fs.writeFileSync(OUT, '\uFEFF' + lines.join('\r\n') + '\r\n', 'utf8');

    console.log(`tenant=${tenantId}`);
    console.log(`exported=${result.rows.length}`);
    console.log(`out=${OUT}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
