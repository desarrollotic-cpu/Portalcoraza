import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const tables = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('job_positions', 'work_centers', 'catalog_values', 'hr_alerts', 'retirements')
     ORDER BY table_name`,
  );

  const hrPerms = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM permissions WHERE module = 'hr'`,
  );

  const associatesCols = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM information_schema.columns
     WHERE table_name = 'associates' AND table_schema = 'public'`,
  );

  console.log('HR tables present:', tables.rows.map((r) => r.table_name).join(', ') || '(none)');
  console.log('HR permissions count:', hrPerms.rows[0]?.n ?? '0');
  console.log('associates column count:', associatesCols.rows[0]?.n ?? '0');

  await client.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
