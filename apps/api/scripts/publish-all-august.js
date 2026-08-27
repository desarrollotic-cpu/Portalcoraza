const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function publishAll() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(`
    UPDATE monthly_schedules
    SET status = 'publicado'
    WHERE year = 2026 AND month = 8
  `);

  console.log(`Publicadas ${res.rowCount} mallas mensuales de Agosto 2026.`);
  await client.end();
}

publishAll().catch(console.error);
