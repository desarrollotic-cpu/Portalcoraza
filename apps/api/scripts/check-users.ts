import { Client } from 'pg';

async function checkUsersSchema() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  console.log('Columns in users:', cols.rows.map(c => c.column_name));

  const admin = await client.query(`SELECT * FROM users WHERE email = 'admin@corazaseguridadcta.com'`);
  console.log('Admin record:', admin.rows[0]);

  await client.end();
}

checkUsersSchema().catch(console.error);
