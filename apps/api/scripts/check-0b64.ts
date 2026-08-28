import { Client } from 'pg';

async function checkLoan0b64() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const loan = await client.query(`SELECT id, requester, email, status, loan_date, updated_at FROM doc_loans WHERE id = '0b64e160-87d5-404d-b5b9-e4b8e1a94835'`);
  console.log('Loan 0b64 details in DB:', loan.rows[0]);

  await client.end();
}

checkLoan0b64().catch(console.error);
