import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  console.log('CONNECTED=OK');

  const expected = [
    'inventory_categories',
    'inventory_items',
    'inventory_variants',
    'inventory_movements',
    'deliveries',
    'delivery_details',
  ];

  const tables = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [expected],
  );
  const found = tables.rows.map((r) => r.table_name as string);
  console.log('EXPECTED=' + expected.join(','));
  console.log('FOUND=' + found.join(','));
  const missing = expected.filter((t) => !found.includes(t));
  console.log('MISSING=' + (missing.length ? missing.join(',') : 'none'));

  const deps = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN ('associates','work_centers','job_positions','users','roles','permissions','posts')
     ORDER BY table_name`,
  );
  console.log('DEPS=' + deps.rows.map((r) => r.table_name).join(','));

  for (const table of expected) {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );
    console.log('--- ' + table + ' ---');
    for (const c of cols.rows) {
      console.log(`  ${c.column_name} (${c.data_type}) null=${c.is_nullable}`);
    }
  }

  const counts = await client.query(`
    SELECT 'inventory_categories' AS t, COUNT(*)::int AS c FROM inventory_categories
    UNION ALL SELECT 'inventory_items', COUNT(*)::int FROM inventory_items
    UNION ALL SELECT 'inventory_variants', COUNT(*)::int FROM inventory_variants
    UNION ALL SELECT 'inventory_movements', COUNT(*)::int FROM inventory_movements
    UNION ALL SELECT 'deliveries', COUNT(*)::int FROM deliveries
    UNION ALL SELECT 'delivery_details', COUNT(*)::int FROM delivery_details
    UNION ALL SELECT 'associates', COUNT(*)::int FROM associates
    UNION ALL SELECT 'users', COUNT(*)::int FROM users
  `);
  console.log('--- COUNTS ---');
  for (const row of counts.rows) {
    console.log(`${row.t}=${row.c}`);
  }

  const perms = await client.query(
    `SELECT code FROM permissions
     WHERE module IN ('inventory','deliveries')
     ORDER BY code`,
  );
  console.log('PERMS=' + perms.rows.map((r) => r.code).join(','));

  const rolePerms = await client.query(
    `SELECT p.code
     FROM role_permissions rp
     JOIN roles r ON r.id = rp.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE r.code = 'ALMACENISTA'
     ORDER BY p.code`,
  );
  console.log('ALMACENISTA_PERMS=' + rolePerms.rows.map((r) => r.code).join(','));

  await client.end();
}

main().catch((e) => {
  console.error('ERROR=' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
