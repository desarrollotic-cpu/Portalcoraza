import { Client } from 'pg';

async function checkAdminPermissionsCodes() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const userRes = await client.query(`SELECT id, email, role_id FROM users WHERE email = 'admin@corazaseguridadcta.com'`);
  const user = userRes.rows[0];

  const perms = await client.query(`
    SELECT p.code, p.name 
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = $1
  `, [user.role_id]);

  console.log(`Permissions count for admin: ${perms.rows.length}`);
  console.log('Documental permissions:', perms.rows.filter(p => p.code.includes('doc')));

  await client.end();
}

checkAdminPermissionsCodes().catch(console.error);
