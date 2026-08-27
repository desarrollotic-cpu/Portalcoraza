const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkAutonomaDetails() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const autPosts = await client.query("SELECT id, name, code FROM posts WHERE name ILIKE '%AUTONOMA%'");

  for (const p of autPosts.rows) {
    console.log(`\n========================================`);
    console.log(`Puesto: ${p.name} (Code: ${p.code}, ID: ${p.id})`);

    const s = await client.query("SELECT id, year, month, status, personal FROM monthly_schedules WHERE post_id = $1 AND year = 2026 AND month = 8", [p.id]);
    if (s.rows[0]) {
      console.log('  Personal en Agosto:', s.rows[0].personal);
      const asigsCount = await client.query("SELECT count(*) FROM schedule_assignments WHERE schedule_id = $1", [s.rows[0].id]);
      console.log('  Asignaciones totales:', asigsCount.rows[0].count);
    } else {
      console.log('  Sin programación en Agosto.');
    }
  }

  await client.end();
}

checkAutonomaDetails().catch(console.error);
