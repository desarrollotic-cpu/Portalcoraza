/**
 * Aplica 054: fechas de certificados y evento de ausentismo opcional.
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
      '054_associate_certs_dates_absence_event_optional.sql',
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
    const cols = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('associate_documents', 'associate_absences')
        AND column_name IN ('issued_date', 'file_url', 'event_type')
      ORDER BY table_name, column_name`);
    console.log(cols.rows);
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
