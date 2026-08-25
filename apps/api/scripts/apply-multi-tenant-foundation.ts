/**
 * Aplica migración 029 (multi-tenant foundation).
 * Uso: npm run db:apply-multi-tenant -w @coraza/api
 * IMPORTANTE: haz backup de Supabase antes de producción.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }
  const file = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'supabase',
    'migrations',
    '040_multi_tenant_foundation.sql',
  );
  if (!fs.existsSync(file)) {
    console.error('No existe', file);
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
  try {
    console.log('→ 040_multi_tenant_foundation.sql');
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log('✓ Migración multi-tenant aplicada');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
