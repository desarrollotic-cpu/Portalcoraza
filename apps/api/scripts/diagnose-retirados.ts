/**
 * diagnose-retirados.ts
 * Detecta asociados marcados como RETIRADO/INACTIVO que en la operación
 * siguen apareciendo (planilla, programación reciente, minutas, cargo asignado).
 * Objetivo: identificar posibles falsos retiros que le cuestan dinero a la empresa.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

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
    // 1) Conteo por status
    console.log('\n📊 Conteo global de asociados por estado:');
    const totales = await client.query(`
      SELECT status, COUNT(*) AS total
      FROM associates
      GROUP BY status
      ORDER BY status;
    `);
    console.table(totales.rows);

    // 2) Retirados/Inactivos SIN registro formal en associate_retirements
    console.log('\n⚠️  RETIRADOS/INACTIVOS SIN acta formal (asociate_retirements vacío):');
    const sinActa = await client.query(`
      SELECT
        a.folder_number AS carpeta,
        a.document_number AS cedula,
        (a.first_name || ' ' || COALESCE(a.first_last_name,'')) AS nombre,
        a.status,
        a.updated_at::date AS "cambio_estado_el",
        (SELECT COUNT(*) FROM associate_retirements r WHERE r.associate_id = a.id) AS actas
      FROM associates a
      WHERE a.status IN ('RETIRADO','INACTIVO')
        AND NOT EXISTS (SELECT 1 FROM associate_retirements r WHERE r.associate_id = a.id)
      ORDER BY a.updated_at DESC
      LIMIT 200;
    `);
    console.log(`  Total: ${sinActa.rowCount}`);
    console.table(sinActa.rows.slice(0, 30));

    // 3) Retirados/Inactivos que aparecen en programación de los últimos 60 días
    console.log('\n🚨 RETIRADOS/INACTIVOS con turnos programados en los últimos 60 días:');
    const programadosCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('monthly_scheduling_cells','monthly_scheduling_assignments','schedule_cells','schedule_assignments')
      LIMIT 1;
    `);
    if (programadosCheck.rowCount === 0) {
      console.log('  (no encuentro tabla de programación monthly_* — reviso otra vía)');
    } else {
      const tbl = programadosCheck.rows[0].table_name;
      const programados = await client.query(`
        SELECT DISTINCT
          a.folder_number AS carpeta,
          a.document_number AS cedula,
          (a.first_name || ' ' || COALESCE(a.first_last_name,'')) AS nombre,
          a.status,
          MAX(c.updated_at)::date AS ultimo_turno
        FROM associates a
        JOIN ${tbl} c ON c.associate_id = a.id
        WHERE a.status IN ('RETIRADO','INACTIVO')
          AND c.updated_at > NOW() - INTERVAL '60 days'
        GROUP BY a.id, a.folder_number, a.document_number, a.first_name, a.first_last_name, a.status
        ORDER BY ultimo_turno DESC
        LIMIT 50;
      `);
      console.log(`  Total sospechosos: ${programados.rowCount}`);
      console.table(programados.rows);
    }

    // 4) Retirados/Inactivos con minuta virtual reciente (últimos 30 días)
    console.log('\n🚨 RETIRADOS/INACTIVOS con actividad en Minuta Virtual últimos 30 días:');
    const minutaTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public' AND table_name LIKE 'minuta_%'
      ORDER BY table_name;
    `);
    const tablas = minutaTables.rows.map((r: any) => r.table_name);
    let sospechososMinuta = 0;
    const minutaMap = new Map<string, { carpeta: any; cedula: any; nombre: string; status: any; ultima: string }>();
    for (const t of tablas) {
      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 AND column_name='associate_id'
      `, [t]);
      if (colCheck.rowCount === 0) continue;
      const res = await client.query(`
        SELECT DISTINCT
          a.id,
          a.folder_number AS carpeta,
          a.document_number AS cedula,
          (a.first_name || ' ' || COALESCE(a.first_last_name,'')) AS nombre,
          a.status,
          MAX(m.created_at)::date AS ultima
        FROM associates a
        JOIN ${t} m ON m.associate_id = a.id
        WHERE a.status IN ('RETIRADO','INACTIVO')
          AND m.created_at > NOW() - INTERVAL '30 days'
        GROUP BY a.id, a.folder_number, a.document_number, a.first_name, a.first_last_name, a.status
      `);
      for (const r of res.rows) {
        const prev = minutaMap.get(r.id);
        if (!prev || String(r.ultima) > String(prev.ultima)) {
          minutaMap.set(r.id, r);
        }
      }
    }
    sospechososMinuta = minutaMap.size;
    console.log(`  Total sospechosos: ${sospechososMinuta}`);
    console.table(Array.from(minutaMap.values()).slice(0, 30));

    // 5) Últimos 20 cambios de status a RETIRADO/INACTIVO
    console.log('\n🕒 Últimos 20 asociados marcados como RETIRADO/INACTIVO (por updated_at):');
    const ultimos = await client.query(`
      SELECT
        a.folder_number AS carpeta,
        a.document_number AS cedula,
        (a.first_name || ' ' || COALESCE(a.first_last_name,'')) AS nombre,
        a.status,
        a.updated_at::date AS "cambio_estado_el",
        u.email AS "cambiado_por"
      FROM associates a
      LEFT JOIN users u ON u.id = a.updated_by
      WHERE a.status IN ('RETIRADO','INACTIVO')
      ORDER BY a.updated_at DESC
      LIMIT 20;
    `);
    console.table(ultimos.rows);

  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
