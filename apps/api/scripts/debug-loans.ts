import { Client } from 'pg';

async function checkRecentLoans() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const res = await client.query(`
    SELECT id, requester, email, document, status, observations, loan_date, return_date, overdue_notified_at, created_at, updated_at
    FROM doc_loans
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 5
  `);

  console.log('--- RECENT LOANS ---');
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

checkRecentLoans().catch(console.error);
