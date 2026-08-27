const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyRelations() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- AUDITORÍA DE RELACIÓN TALENTO HUMANO / PROGRAMACIÓN ---');

  // 1. Total asociados en tabla oficial 'associates' (Gestión Humana / RRHH)
  const totalAssoc = await client.query('SELECT count(*) FROM associates');
  const activeAssoc = await client.query("SELECT count(*) FROM associates WHERE status = 'ACTIVO'");
  
  // 2. Total asociados únicos con turnos asignados en schedule_assignments
  const assignedAssoc = await client.query('SELECT count(DISTINCT associate_id) FROM schedule_assignments WHERE associate_id IS NOT NULL');

  // 3. Verificar Foreign Key o cruce por ID
  const crossCheck = await client.query(`
    SELECT count(DISTINCT sa.associate_id) as matched_count
    FROM schedule_assignments sa
    INNER JOIN associates a ON a.id = sa.associate_id
    WHERE sa.associate_id IS NOT NULL;
  `);

  // 4. Muestra de 5 asociados cruzados
  const sample = await client.query(`
    SELECT a.document_number as cedula, a.first_name || ' ' || a.first_last_name as nombre, 
           a.status as estado_rrhh, p.name as cargo_rrhh, count(sa.id) as turnos_agosto
    FROM schedule_assignments sa
    INNER JOIN associates a ON a.id = sa.associate_id
    LEFT JOIN job_positions p ON p.id = a.job_position_id
    GROUP BY a.document_number, a.first_name, a.first_last_name, a.status, p.name
    LIMIT 5;
  `);

  console.log(`- Total Asociados en Gestión Humana / RRHH (tabla associates): ${totalAssoc.rows[0].count}`);
  console.log(`- Asociados Activos en RRHH: ${activeAssoc.rows[0].count}`);
  console.log(`- Asociados con Turnos Asignados en Programación: ${assignedAssoc.rows[0].count}`);
  console.log(`- Asociados en Programación que cruzan 100% con RRHH (Foreign Key): ${crossCheck.rows[0].matched_count}`);
  console.log('\n--- MUESTRA DE CRUCE EN TIEMPO REAL ---');
  console.table(sample.rows);

  await client.end();
}

verifyRelations().catch(console.error);
