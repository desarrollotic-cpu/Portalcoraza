const dns = require('dns');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function check() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const totalAssociates = await client.query('SELECT count(*) FROM associates');
  const prevAssociates = await client.query("SELECT count(*) FROM associates WHERE created_at < '2026-08-24 14:40:00+00'");
  const newAssociates = await client.query("SELECT count(*) FROM associates WHERE created_at >= '2026-08-24 14:40:00+00'");

  console.log({
    totalAsociados: totalAssociates.rows[0].count,
    yaExistianEnGestionHumana: prevAssociates.rows[0].count,
    nuevosRegistradosDesdeExcel: newAssociates.rows[0].count
  });

  const sampleNew = await client.query("SELECT document_number, first_name, first_last_name FROM associates WHERE created_at >= '2026-08-24 14:40:00+00' LIMIT 10");
  console.log('Nuevos creados:', sampleNew.rows);

  await client.end();
}

check().catch(console.error);
