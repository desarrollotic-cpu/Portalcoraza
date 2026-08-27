import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url?.includes('supabase') || url?.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tablas en la BD:');
  console.log(res.rows.map(r => r.table_name).join(', '));
  await client.end();
}

main().catch(console.error);
