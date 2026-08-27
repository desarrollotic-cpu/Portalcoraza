const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAutonoma() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const aut = await client.query("SELECT id, name FROM posts WHERE name ILIKE '%AUTONOMA%'");
  console.log('Posts Autonoma:', aut.rows);

  for (const p of aut.rows) {
    const s = await client.query("SELECT id, year, month, status FROM monthly_schedules WHERE post_id = $1", [p.id]);
    console.log(`Schedules for ${p.name}:`, s.rows);
  }

  await client.end();
}

checkAutonoma().catch(console.error);
