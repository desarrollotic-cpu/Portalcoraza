const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function check() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const res = await client.query(`
    SELECT u.email, u.full_name, u.is_active, r.code as role_code, r.name as role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE r.code = 'AUDITOR' OR u.email LIKE '%auditor%'
  `);

  console.log('Auditor users found:', res.rows);
  await client.end();
}

check().catch(console.error);
