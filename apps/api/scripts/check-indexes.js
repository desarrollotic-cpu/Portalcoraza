const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkIndexes() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Checking database indexes on scheduling tables...');
  const res = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('monthly_schedules', 'schedule_assignments', 'associates', 'posts')
    ORDER BY tablename, indexname;
  `);

  console.table(res.rows);

  // Let's ensure high-performance composite indexes exist
  console.log('Creating optimized composite indexes for ultra-fast query execution...');
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_monthly_schedules_post_ym ON monthly_schedules (post_id, year, month);
    CREATE INDEX IF NOT EXISTS idx_monthly_schedules_ym ON monthly_schedules (year, month);
    CREATE INDEX IF NOT EXISTS idx_schedule_assignments_sched ON schedule_assignments (schedule_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_assignments_assoc ON schedule_assignments (associate_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_assignments_day_role ON schedule_assignments (schedule_id, day, role);
  `);

  console.log('Optimized indexes created successfully!');
  await client.end();
}

checkIndexes().catch(console.error);
