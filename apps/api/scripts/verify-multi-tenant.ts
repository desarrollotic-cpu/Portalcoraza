/**
 * Verifica post-migración 029: org seed, tenant_id NOT NULL, tablas cp_*.
 * Uso: npm run db:verify-multi-tenant -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CENTRAL = '11111111-1111-1111-1111-111111111111';

const TENANT_TABLES = [
  'users',
  'refresh_tokens',
  'posts',
  'associates',
  'associate_history',
  'audit_logs',
  'notifications',
  'user_posts',
  'user_permissions',
  'inventory_categories',
  'inventory_items',
  'inventory_variants',
  'inventory_movements',
  'deliveries',
  'delivery_details',
  'shift_schedules',
  'monthly_schedules',
  'schedule_assignments',
  'schedule_templates',
  'document_types',
  'document_records',
  'job_positions',
  'work_centers',
  'catalog_values',
  'position_history',
  'associate_retirements',
  'associate_documents',
  'hr_alerts',
  'associate_absences',
  'post_equipment_catalog',
  'post_equipment_assignments',
  'post_equipment_units',
  'reception_visitors',
  'doc_counters',
  'doc_retention_table',
  'doc_correspondence',
  'doc_minutes',
  'doc_retired_personnel',
  'doc_contracts',
  'doc_workflows',
  'doc_loans',
  'doc_library_folders',
  'doc_library_files',
  // 042 post-040
  'minuta_visitantes',
  'minuta_correspondencia',
  'minuta_contratistas',
  'minuta_domiciliarios',
  'minuta_incidentes',
  'minuta_servicio',
  'minuta_entrega_puesto',
  'inventory_warehouses',
  'inventory_stock',
  'puc_accounts',
  'accounting_entries',
  'accounting_entry_details',
  'sig_sistemas',
  'sig_objetivos',
  'sig_indicadores',
  'sig_resultados',
  'sst_clients',
  'sst_workplaces',
  'sst_checklist_items',
  'sst_inspections',
  'sst_responses',
  'sst_evidences',
  'payroll_periods',
  'payroll_slips',
  'payroll_slip_details',
  'vigia_turnos',
  'vigia_sos',
  'vigia_consignas',
  'vigia_minutas',
  'vigia_nomina',
  'vigia_nomina_reclamos',
  'vigia_dotacion_firmas',
  'vigia_pins',
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();

  let failed = 0;
  try {
    const org = await client.query(
      `SELECT id, nombre FROM organizations WHERE id = $1`,
      [CENTRAL],
    );
    if (org.rowCount !== 1) {
      console.error('✗ Falta organization Cooperativa Central');
      failed++;
    } else {
      console.log('✓ Organization:', org.rows[0].nombre);
    }

    for (const name of ['copropiedades', 'cp_visitors', 'cp_packages', 'cp_reservations']) {
      const t = await client.query(`SELECT to_regclass($1) AS r`, [`public.${name}`]);
      if (!t.rows[0].r) {
        console.error('✗ Falta tabla', name);
        failed++;
      } else {
        console.log('✓ Tabla', name);
      }
    }

    for (const table of TENANT_TABLES) {
      const exists = await client.query(`SELECT to_regclass($1) AS r`, [`public.${table}`]);
      if (!exists.rows[0].r) {
        console.log('· skip (no existe):', table);
        continue;
      }
      const nulls = await client.query(
        `SELECT COUNT(*)::int AS c FROM ${table} WHERE tenant_id IS NULL`,
      );
      const foreign = await client.query(
        `SELECT COUNT(*)::int AS c FROM ${table} WHERE tenant_id <> $1`,
        [CENTRAL],
      );
      if (nulls.rows[0].c > 0) {
        console.error(`✗ ${table}: ${nulls.rows[0].c} filas sin tenant_id`);
        failed++;
      } else if (foreign.rows[0].c > 0) {
        console.log(`· ${table}: OK (${foreign.rows[0].c} filas de otros tenants)`);
      } else {
        console.log(`✓ ${table}: tenant_id OK`);
      }
    }
  } finally {
    await client.end();
  }

  if (failed > 0) {
    console.error(`\nFalló verificación (${failed} problemas)`);
    process.exit(1);
  }
  console.log('\n✓ Verificación multi-tenant OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
