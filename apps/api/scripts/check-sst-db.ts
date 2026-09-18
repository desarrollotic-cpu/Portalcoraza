import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function check() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const c = await client.query(`SELECT * FROM sst_clients`);
  console.log('Clients:', c.rows);

  const wp = await client.query(`SELECT * FROM sst_workplaces`);
  console.log('Workplaces:', wp.rows);

  await client.end();
}

check().catch(console.error);
