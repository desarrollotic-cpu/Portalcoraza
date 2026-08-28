import { Client } from 'pg';

async function checkAdminPermissions() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const userRes = await client.query(`
    SELECT u.id, u.email, r.id as role_id, r.name as role_name, r.permissions
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.email = 'admin@corazaseguridadcta.com'
  `);
  console.log('User & Role info:', userRes.rows[0]);

  await client.end();
}

checkAdminPermissions().catch(console.error);
