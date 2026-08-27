const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkPost() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const pId = '06cb3c55-ae81-438d-8eda-dd3a3f3b3681';
  const post = await client.query('SELECT id, name, code FROM posts WHERE id = $1', [pId]);
  console.log('Post in screenshot:', post.rows[0]);

  if (post.rows[0]) {
    const s = await client.query('SELECT id, year, month, status FROM monthly_schedules WHERE post_id = $1', [pId]);
    console.log('Schedules:', s.rows);
  }

  await client.end();
}

checkPost().catch(console.error);
