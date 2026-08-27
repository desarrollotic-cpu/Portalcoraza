const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setupPayrollPeriods() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Verificando periodos oficiales de nómina...');

  const periods = [
    { name: 'Nómina Mensual Agosto 2026', start: '2026-08-01', end: '2026-08-31', status: 'BORRADOR' },
    { name: 'Nómina Mensual Julio 2026', start: '2026-07-01', end: '2026-07-31', status: 'LIQUIDADO' },
    { name: 'Nómina Mensual Junio 2026', start: '2026-06-01', end: '2026-06-30', status: 'LIQUIDADO' },
  ];

  for (const p of periods) {
    const res = await client.query('SELECT id FROM payroll_periods WHERE start_date = $1', [p.start]);
    if (!res.rows[0]) {
      await client.query(
        `INSERT INTO payroll_periods (period_name, start_date, end_date, status) VALUES ($1, $2, $3, $4)`,
        [p.name, p.start, p.end, p.status]
      );
      console.log(`✓ Creado periodo: ${p.name}`);
    } else {
      console.log(`- Periodo existente: ${p.name}`);
    }
  }

  await client.end();
}

setupPayrollPeriods().catch(console.error);
