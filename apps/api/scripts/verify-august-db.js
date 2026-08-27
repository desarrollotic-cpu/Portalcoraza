const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifySample() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Verificando muestra de puestos y asignaciones de Agosto 2026:');
  const sample = await client.query(`
    SELECT p.code, p.name, ms.personal, count(sa.id) as total_celdas
    FROM monthly_schedules ms
    JOIN posts p ON p.id = ms.post_id
    JOIN schedule_assignments sa ON sa.schedule_id = ms.id
    WHERE ms.year = 2026 AND ms.month = 8
    GROUP BY p.code, p.name, ms.personal
    LIMIT 5;
  `);

  for (const row of sample.rows) {
    console.log(`\nPuesto: ${row.code} - ${row.name} (Celdas: ${row.total_celdas})`);
    console.log(`  Personal:`, row.personal);
  }

  await client.end();
}

verifySample().catch(console.error);
