require('dotenv').config({ path: 'apps/api/.env' });
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.xavcwqmtmbyqvyryvdsp:Z%3Fp%23N3%24k%21L8%40mQ%2A6@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log('Synchronizing doc_counters with existing data...');

  const updates = [
    { scope: 'contract', val: 713 },
    { scope: 'retired_personnel', val: 3835 },
    { scope: 'minute:SERVICIO', val: 528 },
    { scope: 'minute:VISITANTES', val: 264 },
    { scope: 'minute:CORRESPONDENCIA', val: 92 },
    { scope: 'correspondence:SP', val: 564 },
    { scope: 'correspondence:CM', val: 39 },
    { scope: 'correspondence:CE', val: 33 },
    { scope: 'correspondence:AF', val: 256 },
    { scope: 'correspondence:GF', val: 256 },
    { scope: 'correspondence:OP', val: 6 },
    { scope: 'correspondence:CP', val: 5 },
    { scope: 'correspondence:GE', val: 1 },
    { scope: 'correspondence:GH', val: 1 },
    { scope: 'correspondence:SE', val: 1 },
    { scope: 'correspondence:DJ', val: 1 },
    { scope: 'correspondence:AS', val: 1 },
  ];

  for (const u of updates) {
    await client.query(`
      INSERT INTO doc_counters (scope, last_value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (scope)
      DO UPDATE SET last_value = GREATEST(doc_counters.last_value, EXCLUDED.last_value), updated_at = NOW()
    `, [u.scope, u.val]);
  }

  const counters = await client.query('SELECT * FROM doc_counters ORDER BY scope');
  console.log('Counters after sync:');
  console.table(counters.rows);

  await client.end();
}
run();
