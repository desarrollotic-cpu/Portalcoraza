const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyDetailedSample() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Verificando 3 puestos específicos en Agosto 2026:');
  
  const samplePuestos = ['TORRE NAVARRA PORTERIA', 'INTERCLUB PORTERIA', 'EDIFICIO 808'];

  for (const name of samplePuestos) {
    const postRes = await client.query(`
      SELECT p.id, p.code, p.name, ms.personal
      FROM posts p
      JOIN monthly_schedules ms ON ms.post_id = p.id
      WHERE ms.year = 2026 AND ms.month = 8 AND UPPER(p.name) LIKE UPPER($1)
      LIMIT 1;
    `, [`%${name}%`]);

    if (postRes.rows.length) {
      const p = postRes.rows[0];
      console.log(`\n🏢 PUESTO: ${p.code} - ${p.name}`);
      console.log(`  Personal asignado:`, p.personal.map(x => `${x.displayName}: ${x.associateId}`));
      
      const assigRes = await client.query(`
        SELECT sa.day, sa.role, a.document_number, a.first_name, a.first_last_name, sa.codigo, sa.turno
        FROM schedule_assignments sa
        JOIN monthly_schedules ms ON ms.id = sa.schedule_id
        LEFT JOIN associates a ON a.id = sa.associate_id
        WHERE ms.post_id = $1 AND ms.year = 2026 AND ms.month = 8 AND sa.day IN (1, 2, 3, 4, 15, 31)
        ORDER BY sa.day, sa.role;
      `, [p.id]);

      console.log(`  Muestra de turnos (Días 1, 2, 3, 4, 15, 31):`);
      console.table(assigRes.rows.map(r => ({
        Dia: r.day,
        Rol: r.role,
        Cedula: r.document_number,
        Vigilante: `${r.first_name || ''} ${r.first_last_name || ''}`.trim(),
        Codigo: r.codigo,
        Turno: r.turno
      })));
    }
  }

  await client.end();
}

verifyDetailedSample().catch(console.error);
