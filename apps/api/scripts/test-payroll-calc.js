const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testPayrollCalculation() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Buscando o creando periodo de nómina Agosto 2026...');
  let period = await client.query("SELECT id, period_name, status FROM payroll_periods WHERE start_date = '2026-08-01' LIMIT 1");

  let pId = period.rows[0]?.id;
  if (!pId) {
    const ins = await client.query(`
      INSERT INTO payroll_periods (period_name, start_date, end_date, status)
      VALUES ('Nómina Oficial Agosto 2026', '2026-08-01', '2026-08-31', 'BORRADOR')
      RETURNING id
    `);
    pId = ins.rows[0].id;
  }

  console.log(`Periodo ID: ${pId}`);

  // Verificar asignaciones que se procesarán
  const asigs = await client.query(`
    SELECT count(distinct sa.associate_id) as vigilantes_programados, count(*) as total_turnos
    FROM schedule_assignments sa
    JOIN monthly_schedules ms ON ms.id = sa.schedule_id
    WHERE ms.year = 2026 AND ms.month = 8 AND sa.associate_id IS NOT NULL
  `);

  console.log('Resumen Operativo Agosto 2026 para Nómina:');
  console.log(`- Vigilantes con turnos oficiales: ${asigs.rows[0].vigilantes_programados}`);
  console.log(`- Turnos totales programados: ${asigs.rows[0].total_turnos}`);

  await client.end();
}

testPayrollCalculation().catch(console.error);
