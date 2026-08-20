const { Client } = require('pg');

// Portal Coraza - DB principal (duxpqkldgdnfcabpkogl)
const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.duxpqkldgdnfcabpkogl',
  password: 'Freider1004*',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Conectado OK a Portal Coraza');
    const res = await client.query(`
      SELECT id, email, raw_user_meta_data->>'full_name' as nombre, raw_user_meta_data->>'role' as rol
      FROM auth.users
      ORDER BY created_at
      LIMIT 20;
    `);
    console.table(res.rows);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

main();
