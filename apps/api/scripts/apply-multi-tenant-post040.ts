/**
 * Aplica 042_multi_tenant_post040.sql
 * Uso: npm run db:apply-multi-tenant-post040 -w @coraza/api
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
    '042_multi_tenant_post040.sql',
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
    console.log('→ 042_multi_tenant_post040.sql');
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log('✓ Multi-tenant post-040 aplicado');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
