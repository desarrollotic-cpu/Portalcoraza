/**
 * Aplica 069: elimina rol INTERVENTOR.
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
  if (!url) throw new Error('Falta DATABASE_URL');
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      'supabase',
      'migrations',
      '069_drop_interventor.sql',
    ),
    'utf8',
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
    await client.query(sql);
    const r = await client.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM roles WHERE code = 'INTERVENTOR'`,
    );
    if (r.rows[0]?.n !== '0') throw new Error('INTERVENTOR sigue en roles');
    console.log('OK 069: rol INTERVENTOR eliminado');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
