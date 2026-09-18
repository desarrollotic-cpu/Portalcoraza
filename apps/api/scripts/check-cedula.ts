import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { throw new Error('Missing DATABASE_URL'); }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const u = await client.query(`SELECT id, email, tenant_id, role_id FROM users WHERE email LIKE '%documental%'`);
    console.log('👤 Usuario:', u.rows);

    const a = await client.query(`SELECT id, document_number, first_name, first_last_name, tenant_id, status FROM associates WHERE document_number = '71625464'`);
    console.log('👥 Asociado 71625464:', a.rows);

    const d = await client.query(`SELECT * FROM doc_retired_personnel WHERE id_number = '71625464'`);
    console.log('📁 doc_retired_personnel 71625464:', d.rows);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
