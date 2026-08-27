import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const res = await client.query(`
      SELECT codigo, nombre, area, frecuencia, sentido
      FROM sig_indicadores
      ORDER BY area, codigo;
    `);
    console.table(res.rows);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
