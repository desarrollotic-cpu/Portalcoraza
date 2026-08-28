import { Client } from 'pg';

async function checkLoanRecord() {
  const client = new Client({
    connectionString: 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const loan = await client.query(`SELECT * FROM doc_loans WHERE id = '0df8ec64-e5bf-4606-bd1a-4a3b1251f747'`);
  console.log('Loan 0df8ec64 details:', loan.rows[0]);

  await client.end();
}

checkLoanRecord().catch(console.error);
