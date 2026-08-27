import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: url,
    ssl: url?.includes('supabase') || url?.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const res = await client.query(`
    SELECT email, password_hash
    FROM users
    WHERE email = 'admin@corazaseguridadcta.com';
  `);

  if (res.rows.length > 0) {
    const hash = res.rows[0].password_hash;
    const testPass = 'Coraza2026!';
    const matches = await bcrypt.compare(testPass, hash);
    console.log(`Password "${testPass}" matches:`, matches);
    if (!matches) {
      // Let's set it to Coraza2026!
      const newHash = await bcrypt.hash(testPass, 10);
      await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'admin@corazaseguridadcta.com'`, [newHash]);
      console.log('Password successfully reset to:', testPass);
    }
  }

  await client.end();
}

main().catch(console.error);
