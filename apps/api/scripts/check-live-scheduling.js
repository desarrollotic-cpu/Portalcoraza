const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const posts = await client.query('SELECT id, name, code, status FROM posts ORDER BY name ASC LIMIT 5');
  console.log('Sample posts:', posts.rows);

  const scheds = await client.query(`
    SELECT ms.id, ms.post_id, p.name as post_name, ms.year, ms.month, ms.status
    FROM monthly_schedules ms
    JOIN posts p ON p.id = ms.post_id
    WHERE ms.year = 2026 AND ms.month = 8
    ORDER BY p.name ASC
    LIMIT 5
  `);
  console.log('Sample August schedules in DB:', scheds.rows);

  const day24 = await client.query(`
    SELECT sa.day, sa.codigo, sa.jornada, a.document_number, a.first_name, a.first_last_name, p.name as post_name
    FROM schedule_assignments sa
    JOIN monthly_schedules ms ON ms.id = sa.schedule_id
    JOIN posts p ON p.id = ms.post_id
    LEFT JOIN associates a ON a.id = sa.associate_id
    WHERE ms.year = 2026 AND ms.month = 8 AND sa.day = 24 AND sa.codigo IS NOT NULL
    LIMIT 5
  `);
  console.log('Sample Day 24 assignments:', day24.rows);

  await client.end();
}

check().catch(console.error);
