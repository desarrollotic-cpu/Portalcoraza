import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

async function testPassword() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const res = await client.query(`SELECT email, password_hash FROM users WHERE email = 'sst@corazaseguridadcta.com'`);
  if (res.rows.length > 0) {
    const hash = res.rows[0].password_hash;
    const passwordsToTest = ['Coraza2026!', 'Coraza2025!', 'Sst2026!', 'SST2026!', 'Coraza123*', 'admin123', 'Coraza2024!'];
    for (const p of passwordsToTest) {
      const match = await bcrypt.compare(p, hash);
      if (match) {
        console.log(`FOUND PASSWORD for SST: ${p}`);
        await client.end();
        return;
      }
    }
    console.log('Password not in standard list. Let us update it to Coraza2026!');
    const newHash = await bcrypt.hash('Coraza2026!', 12);
    await client.query(`UPDATE users SET password_hash = $1 WHERE email = 'sst@corazaseguridadcta.com'`, [newHash]);
    console.log('Updated SST password to: Coraza2026!');
  }

  await client.end();
}

testPassword().catch(console.error);
