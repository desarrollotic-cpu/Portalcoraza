import { Client } from 'pg';

async function checkSstUser() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const allUsers = await client.query(`
    SELECT u.*, r.name as role_name
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY u.created_at ASC
  `);

  console.log('\n--- All Users in System ---');
  console.log(JSON.stringify(allUsers.rows, null, 2));

  const allRoles = await client.query(`SELECT * FROM roles ORDER BY name ASC`);
  console.log('\n--- All Roles ---');
  console.log(JSON.stringify(allRoles.rows, null, 2));

  await client.end();
}

checkSstUser().catch(console.error);
