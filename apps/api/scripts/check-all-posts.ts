import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkPosts() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const posts = await client.query(`
    SELECT id, code, name, client_name, address, status, type
    FROM posts
    ORDER BY name ASC
  `);
  console.log(`Total puestos en tabla posts: ${posts.rows.length}`);
  console.log('Posts:', posts.rows);

  const workCenters = await client.query(`
    SELECT id, code, name, client_name, is_active
    FROM work_centers
    ORDER BY name ASC
  `);
  console.log(`Total centros de trabajo RRHH: ${workCenters.rows.length}`);

  await client.end();
}

checkPosts().catch(console.error);
