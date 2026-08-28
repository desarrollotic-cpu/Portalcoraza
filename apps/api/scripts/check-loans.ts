import { Client } from 'pg';

async function checkLatestLoans() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const res = await client.query(`
    SELECT id, requester, email, document, status, observations, loan_date, return_date, created_at, updated_at
    FROM doc_loans
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 10
  `);

  console.log('--- LATEST 10 LOANS IN DB ---');
  console.table(res.rows);

  await client.end();
}

checkLatestLoans().catch(console.error);
