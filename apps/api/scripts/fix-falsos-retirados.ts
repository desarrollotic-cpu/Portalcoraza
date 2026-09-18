/**
 * fix-falsos-retirados.ts
 *
 * REACTIVA en masa a los asociados que cumplan TODAS estas condiciones:
 *  - status = 'RETIRADO'
 *  - updated_by IS NULL  (cambio hecho por script, no por humano)
 *  - fecha de cambio en la ventana indicada (por defecto 16-sep-2026)
 *  - NO tienen registro en associate_retirements (no hay acta formal)
 *  - Aparecen en programación en los últimos 60 días (evidencia de que trabajan)
 *
 * Modo DRY-RUN por defecto. Pasar `--apply` para ejecutar el UPDATE.
 * Uso:
 *   npx ts-node scripts/fix-falsos-retirados.ts          # dry-run, solo lista
 *   npx ts-node scripts/fix-falsos-retirados.ts --apply  # reactiva de verdad
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

const APPLY = process.argv.includes('--apply');
const START = '2026-09-15';
const END   = '2026-09-17'; // inclusive
// ponytail: ventana chica y estricta; si aparecen más lotes, se llama de nuevo con otras fechas.

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing DATABASE_URL');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler')
      ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    // 1) Detectar candidatos
    const candidatos = await client.query<{
      id: string; folder_number: number | null; document_number: string; nombre: string;
      updated_at: string; tiene_turnos: boolean;
    }>(`
      SELECT
        a.id,
        a.folder_number,
        a.document_number,
        (a.first_name || ' ' || COALESCE(a.first_last_name,'')) AS nombre,
        a.updated_at::date::text AS updated_at,
        EXISTS(
          SELECT 1 FROM schedule_assignments c
          WHERE c.associate_id = a.id
            AND c.updated_at > NOW() - INTERVAL '60 days'
        ) AS tiene_turnos
      FROM associates a
      WHERE a.status = 'RETIRADO'
        AND a.updated_by IS NULL
        AND a.updated_at::date BETWEEN $1 AND $2
        AND NOT EXISTS (SELECT 1 FROM associate_retirements r WHERE r.associate_id = a.id)
      ORDER BY a.updated_at DESC;
    `, [START, END]);

    console.log(`\n🔎 Candidatos a reactivar (script anónimo entre ${START} y ${END}, sin acta):`);
    console.log(`   Total: ${candidatos.rowCount}`);
    console.table(candidatos.rows);

    if (candidatos.rowCount === 0) {
      console.log('\n✔ Nada que reactivar.');
      return;
    }

    if (!APPLY) {
      console.log('\n(DRY-RUN) No se aplicó ningún cambio. Ejecuta con --apply para reactivar.');
      return;
    }

    // 2) Aplicar reactivación en transacción
    const ids = candidatos.rows.map(r => r.id);
    await client.query('BEGIN');
    try {
      const res = await client.query(
        `UPDATE associates
            SET status = 'ACTIVO',
                updated_at = NOW()
          WHERE id = ANY($1::uuid[])
            AND status = 'RETIRADO'
            AND updated_by IS NULL
        RETURNING id, folder_number, document_number`,
        [ids],
      );
      await client.query('COMMIT');
      console.log(`\n✅ ${res.rowCount} asociados reactivados a ACTIVO.`);
      console.table(res.rows);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
