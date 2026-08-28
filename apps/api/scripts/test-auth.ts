import { Client } from 'pg';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

async function testAuthStack() {
  console.log('--- 1. Testing Database Connection ---');
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✅ DB Connected!');

  console.log('--- 2. Finding Admin User ---');
  const res = await client.query(`SELECT id, email, password_hash, status, full_name FROM users WHERE email = 'admin@corazaseguridadcta.com'`);
  console.log('User found:', res.rows[0]);

  if (res.rows.length > 0) {
    const user = res.rows[0];
    const match = await bcrypt.compare('Coraza2026!', user.password_hash);
    console.log('Password match Coraza2026!:', match);

    console.log('--- 3. Testing JWT Signing ---');
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: 'admin' },
      'coraza-dev-access-secret-change-in-production-32c',
      { expiresIn: '15m' }
    );
    console.log('✅ JWT Token signed successfully:', token.slice(0, 20) + '...');
  }

  await client.end();
}

testAuthStack().catch(console.error);
