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
    SELECT u.id, u.email, u.full_name, r.name as role_name, r.code as role_code, u.is_active
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY r.name, u.email;
  `);

  console.log('Usuarios en el sistema:');
  console.table(res.rows);

  await client.end();
}

main().catch(console.error);
