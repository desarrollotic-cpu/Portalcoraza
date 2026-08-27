const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testGetOne() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const coop = await client.query("SELECT id, name FROM posts WHERE name ILIKE '%COOPIDROGAS%' LIMIT 1");
  console.log('Post Coopidrogas:', coop.rows[0]);

  if (coop.rows[0]) {
    const pId = coop.rows[0].id;
    const sched = await client.query("SELECT id, post_id, year, month, status, personal FROM monthly_schedules WHERE post_id = $1 AND year = 2026 AND month = 8", [pId]);
    console.log('Schedule:', sched.rows[0]);

    if (sched.rows[0]) {
      const asigs = await client.query("SELECT count(*) FROM schedule_assignments WHERE schedule_id = $1", [sched.rows[0].id]);
      console.log('Assignments count:', asigs.rows[0].count);
    }
  }

  await client.end();
}

testGetOne().catch(console.error);
