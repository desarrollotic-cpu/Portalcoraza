/**
 * Aplica 029b (DEFAULT tenant_id) para no romper INSERT de Nest pre-Semana 2.
 * Uso: npm run db:apply-multi-tenant-default -w @coraza/api
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
    '029b_tenant_id_default.sql',
  );
  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    console.log('→ 029b_tenant_id_default.sql');
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log('✓ DEFAULT tenant_id aplicado');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
