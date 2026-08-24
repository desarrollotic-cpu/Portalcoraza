/**
 * Aplica 030_multi_tenant_rls.sql
 * Uso: npm run db:apply-multi-tenant-rls -w @coraza/api
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
    '030_multi_tenant_rls.sql',
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
    console.log('→ 030_multi_tenant_rls.sql');
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log('✓ RLS multi-tenant aplicado');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
