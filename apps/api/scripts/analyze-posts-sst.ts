import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function analyzePosts() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const posts = await client.query(`
    SELECT id, code, name, client_name, address, status, type, tenant_id
    FROM posts
    ORDER BY name ASC
  `);
  console.log(`Total posts en sistema: ${posts.rows.length}`);
  console.log('Muestra de los primeros 10:');
  console.log(posts.rows.slice(0, 10));

  const sstClients = await client.query(`SELECT id, nombre FROM sst_clients`);
  console.log('Clientes SST existentes:', sstClients.rows);

  const sstWp = await client.query(`SELECT id, nombre, post_id FROM sst_workplaces`);
  console.log(`Puestos SST actuales: ${sstWp.rows.length}`);

  await client.end();
}

analyzePosts().catch(console.error);
