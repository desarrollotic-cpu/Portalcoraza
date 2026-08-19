/**
 * Aplica 036_posts_ops_fields.sql
 * Uso: npm run db:apply-posts-ops -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL en apps/api/.env');
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
    const file = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'supabase',
      'migrations',
      '036_posts_ops_fields.sql',
    );
    await client.query(fs.readFileSync(file, 'utf8'));
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'posts' AND column_name IN
       ('zone','contact_name','phone','priority','contract_number','service_type','armed','requirements','instructions')
       ORDER BY column_name`,
    );
    console.log('✓ 036 posts ops fields:', cols.rows.map((r) => r.column_name).join(', '));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
