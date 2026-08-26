import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    console.log('Creando índices de aceleración para todos los módulos de Coraza...');

    const indexes = [
      // Documental
      'CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);',
      'CREATE INDEX IF NOT EXISTS idx_contracts_voxelsera ON contracts(voxelsera);',
      'CREATE INDEX IF NOT EXISTS idx_correspondence_status ON correspondence(status);',
      'CREATE INDEX IF NOT EXISTS idx_correspondence_voxelsera ON correspondence(voxelsera);',
      'CREATE INDEX IF NOT EXISTS idx_minutes_type ON minutes(minute_type);',
      'CREATE INDEX IF NOT EXISTS idx_minutes_voxelsera ON minutes(voxelsera);',
      'CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);',
      'CREATE INDEX IF NOT EXISTS idx_retired_voxelsera ON retired_personnel(voxelsera);',

      // RRHH / Asociados
      'CREATE INDEX IF NOT EXISTS idx_associates_status ON associates(status);',
      'CREATE INDEX IF NOT EXISTS idx_associates_hire_date ON associates(hire_date);',
      'CREATE INDEX IF NOT EXISTS idx_associate_retirements_date ON associate_retirements(retirement_date);',
      'CREATE INDEX IF NOT EXISTS idx_associate_absenteeism_dates ON associate_absenteeism(start_date, end_date);',

      // Programación / Turnos
      'CREATE INDEX IF NOT EXISTS idx_monthly_schedules_period ON monthly_schedules(year, month);',
      'CREATE INDEX IF NOT EXISTS idx_schedule_assignments_sch ON schedule_assignments(schedule_id);',
      'CREATE INDEX IF NOT EXISTS idx_schedule_assignments_assoc ON schedule_assignments(associate_id);',

      // Dotación e Inventario
      'CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(current_stock);',
      'CREATE INDEX IF NOT EXISTS idx_deliveries_date ON dotacion_deliveries(delivery_date);',

      // Recepción
      'CREATE INDEX IF NOT EXISTS idx_reception_status ON reception_records(status);',
      'CREATE INDEX IF NOT EXISTS idx_reception_entry ON reception_records(entry_time);',

      // SIG
      'CREATE INDEX IF NOT EXISTS idx_sig_resultados_lookup ON sig_resultados(indicador_id, anio, periodo);',
      'CREATE INDEX IF NOT EXISTS idx_sig_indicadores_area ON sig_indicadores(area, activo);'
    ];

    for (const sql of indexes) {
      try {
        await client.query(sql);
        console.log('✓', sql.trim().replace(';', ''));
      } catch (err: any) {
        console.warn('⚠ Error en índice (puede ser tabla no existente):', err.message);
      }
    }

    console.log('\n✅ ¡Índices de alta velocidad creados con éxito en PostgreSQL!');
  } finally {
    await client.end();
  }
}

main().catch(console.error);
