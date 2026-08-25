/**
 * Aplica 037_reception_visitor_associate.sql
 * Uso: npm run db:apply-reception-associate -w @coraza/api
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
      '037_reception_visitor_associate.sql',
    );
    await client.query(fs.readFileSync(file, 'utf8'));
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'reception_visitors' AND column_name = 'is_associate'`,
    );
    console.log('✓ 037 is_associate:', cols.rows.length ? 'ok' : 'missing');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
