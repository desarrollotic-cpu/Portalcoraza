const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function populateJulio() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('Sincronizando mallas para Julio 2026...');
  // For each post that has an August schedule, make sure July schedule exists
  const augScheds = await client.query(`
    SELECT ms.id, ms.post_id, ms.personal
    FROM monthly_schedules ms
    WHERE ms.year = 2026 AND ms.month = 8
  `);

  let createdJul = 0;
  for (const row of augScheds.rows) {
    const checkJul = await client.query(
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
      createdJul++;

      // Clone assignments for 31 days of July
      const asigs = await client.query(
        `SELECT day, role, associate_id, turno, jornada, codigo, inicio, fin
         FROM schedule_assignments WHERE schedule_id = $1 AND day <= 31`,
        [row.id]
      );

      for (const a of asigs.rows) {
        await client.query(
          `INSERT INTO schedule_assignments (schedule_id, day, role, associate_id, turno, jornada, codigo, inicio, fin)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [julId, a.day, a.role, a.associate_id, a.turno, a.jornada, a.codigo, a.inicio, a.fin]
        );
      }
    }
  }

  console.log(`✓ Sincronizadas ${createdJul} mallas en Julio 2026.`);
  await client.end();
}

populateJulio().catch(console.error);
