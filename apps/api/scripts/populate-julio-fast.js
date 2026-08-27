const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function populateJulioFast() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Sincronizando mallas para Julio 2026 en lote...');
  const augScheds = await client.query(`
    SELECT ms.id, ms.post_id, ms.personal
    FROM monthly_schedules ms
    WHERE ms.year = 2026 AND ms.month = 8
  `);

  const allAssignmentsToInsert = [];

  for (const row of augScheds.rows) {
    let checkJul = await client.query(
      `SELECT id FROM monthly_schedules WHERE post_id = $1 AND year = 2026 AND month = 7 LIMIT 1`,
      [row.post_id]
    );

    let julId = checkJul.rows[0]?.id;
    if (!julId) {
      const ins = await client.query(
        `INSERT INTO monthly_schedules (post_id, year, month, status, personal)
         VALUES ($1, 2026, 7, 'publicado', $2::jsonb) RETURNING id`,
        [row.post_id, JSON.stringify(row.personal)]
      );
      julId = ins.rows[0].id;
    }

    const asigs = await client.query(
      `SELECT day, role, associate_id, turno, jornada, codigo, inicio, fin
       FROM schedule_assignments WHERE schedule_id = $1 AND day <= 31`,
      [row.id]
    );

    for (const a of asigs.rows) {
      allAssignmentsToInsert.push({
        scheduleId: julId,
        day: a.day,
        role: a.role,
        associateId: a.associate_id,
        turno: a.turno,
        jornada: a.jornada,
        codigo: a.codigo,
        inicio: a.inicio,
        fin: a.fin,
      });
    }
  }

  await client.query(`
    DELETE FROM schedule_assignments
    WHERE schedule_id IN (SELECT id FROM monthly_schedules WHERE year = 2026 AND month = 7)
  `);

  console.log(`Insertando ${allAssignmentsToInsert.length} asignaciones de Julio...`);
  const chunkSize = 500;
  for (let i = 0; i < allAssignmentsToInsert.length; i += chunkSize) {
    const chunk = allAssignmentsToInsert.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const params = [];

    chunk.forEach((item, idx) => {
      const offset = idx * 9;
      valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`);
      params.push(
        item.scheduleId,
        item.day,
        item.role,
        item.associateId,
        item.turno,
        item.jornada,
        item.codigo,
        item.inicio,
        item.fin
      );
    });

    const query = `
      INSERT INTO schedule_assignments (schedule_id, day, role, associate_id, turno, jornada, codigo, inicio, fin)
      VALUES ${valuePlaceholders.join(', ')}
    `;
    await client.query(query, params);
  }

  console.log(`✓✓ Julio 2026 sincronizado al 100% con ${allAssignmentsToInsert.length} turnos.`);
  await client.end();
}

populateJulioFast().catch(console.error);
