import { DataSource } from 'typeorm';

async function main() {
  const password = process.env.DB_PASSWORD || '26Hh9rwHQGPiBNSC';
  const projectRef = 'duxpqkldgdnfcabpkogl';

  const ds = new DataSource({
    type: 'postgres',
    host: `aws-1-us-east-2.pooler.supabase.com`,
    port: 5432,
    username: `postgres.${projectRef}`,
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  await ds.initialize();
  console.log('Connected to Portal Coraza target DB.');

  const tables = await ds.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%doc%'
  `);
  console.log('Documental tables in Portal Coraza:', tables);

  await ds.destroy();
}

main();
