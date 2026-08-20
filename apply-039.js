const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'apps/api/.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^"(.*)"$/, '$1');
  });
}

const url = process.env.DATABASE_URL;
if (!url) { console.error('❌ No DATABASE_URL'); process.exit(1); }

const client = new Client({
  connectionString: url,
  ssl: (url.includes('supabase') || url.includes('pooler')) ? { rejectUnauthorized: false } : false
});

async function main() {
  await client.connect();
  console.log('✅ Conectado a DB');

  const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/039_loan_email_notification.sql'), 'utf8');
  await client.query(sql);
  console.log('✅ Migración 039 aplicada correctamente');

  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'doc_loans' AND column_name IN ('email', 'overdue_notified_at')
  `);
  console.log('Columnas en doc_loans:', res.rows);
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
