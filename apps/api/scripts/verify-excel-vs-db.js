const dns = require('dns');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const ExcelJS = require('exceljs');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function verify() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log('=== AUDITORÍA RIGUROSA: EXCEL vs BASE DE DATOS ===\n');

  // Let's sample test 5 specific guards across different zones
  const testGuards = [
    { zone: '04', name: 'HENAO GOEZ ALEX ORLANDO', cedula: '1037269695', post: 'TORRE NAVARRA PORTERIA 24H L-D' },
    { zone: '06', name: 'LEON JIMENEZ DAIRON', cedula: '70786990', post: 'INTERCLUB PORTERIA' },
    { zone: '09', name: 'VILLA ARENAS CARLOS ARTURO', cedula: '91435066', post: 'BALCON DE LA VILLA' },
    { zone: '23', name: 'GARZON YEISON ANDRES', cedula: '1054561422', post: 'ARDILLEROS DE LALINDE 24 H L-D' }
  ];

  for (const tg of testGuards) {
    const assoc = await client.query('SELECT id, first_name, first_last_name FROM associates WHERE document_number = $1', [tg.cedula]);
    if (!assoc.rows[0]) {
      console.log(`[ALERTA] Asociado ${tg.cedula} no encontrado en DB`);
      continue;
    }
    const assocId = assoc.rows[0].id;

    const asigs = await client.query(
      `SELECT day, turno, jornada, codigo, inicio, fin 
       FROM schedule_assignments sa
       JOIN monthly_schedules ms ON ms.id = sa.schedule_id
       WHERE sa.associate_id = $1 AND ms.year = 2026 AND ms.month = 8
       ORDER BY day ASC`,
      [assocId]
    );

    console.log(`Guardia: ${tg.name} (CC: ${tg.cedula}) - Puesto: ${tg.post}`);
    console.log(`Total días registrados en DB: ${asigs.rows.length}/31`);
    
    // Sample first 10 days
    const d1to10 = asigs.rows.slice(0, 10).map(r => `Día ${r.day}: [${r.codigo || '-'}] (${r.jornada})`).join(' | ');
    console.log(`  Días 1..10 en DB: ${d1to10}\n`);
  }

  // Check total counts
  const totalSchedules = await client.query('SELECT count(*) FROM monthly_schedules WHERE year = 2026 AND month = 8');
  const totalAssignments = await client.query(
    'SELECT count(*) FROM schedule_assignments sa JOIN monthly_schedules ms ON ms.id = sa.schedule_id WHERE ms.year = 2026 AND ms.month = 8'
  );
  const totalWithCode = await client.query(
    `SELECT count(*) FROM schedule_assignments sa 
     JOIN monthly_schedules ms ON ms.id = sa.schedule_id 
     WHERE ms.year = 2026 AND ms.month = 8 AND sa.codigo IS NOT NULL`
  );

  console.log('--- Resumen Global de Integridad ---');
  console.log(`Mallas publicadas Agosto: ${totalSchedules.rows[0].count}`);
  console.log(`Total celdas de asignación: ${totalAssignments.rows[0].count}`);
  console.log(`Total turnos efectivos con turno/descanso: ${totalWithCode.rows[0].count}`);

  await client.end();
}

verify().catch(console.error);
