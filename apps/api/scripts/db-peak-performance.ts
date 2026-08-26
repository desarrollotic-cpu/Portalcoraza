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

  console.log('🚀 Aplicando optimización 10/10 de PostgreSQL (Índices compuestos y estadísticas)...');

  const performanceSQLs = [
    // 1. Índices compuestos para consultas rápidas multi-columna
    'CREATE INDEX IF NOT EXISTS idx_associates_lookup ON associates(tenant_id, status, work_center_id);',
    'CREATE INDEX IF NOT EXISTS idx_associates_doc ON associates(tenant_id, document_number);',
    'CREATE INDEX IF NOT EXISTS idx_doc_contracts_lookup ON doc_contracts(tenant_id, status, end_date);',
    'CREATE INDEX IF NOT EXISTS idx_doc_correspondence_lookup ON doc_correspondence(tenant_id, document_code, status);',
    'CREATE INDEX IF NOT EXISTS idx_doc_minutes_lookup ON doc_minutes(tenant_id, minute_type, post_id);',
    'CREATE INDEX IF NOT EXISTS idx_doc_loans_lookup ON doc_loans(tenant_id, status, return_date);',
    'CREATE INDEX IF NOT EXISTS idx_sig_resultados_perf ON sig_resultados(tenant_id, indicador_id, anio, periodo);',
    'CREATE INDEX IF NOT EXISTS idx_monthly_sch_perf ON monthly_schedules(tenant_id, year, month, status);',
    'CREATE INDEX IF NOT EXISTS idx_sch_assignments_perf ON schedule_assignments(schedule_id, associate_id, post_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_perf ON audit_logs(tenant_id, module, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_notifications_perf ON notifications(tenant_id, is_read, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_users_login_perf ON users(email, is_active);',

    // 2. Analizar y optimizar planes de ejecución del optimizador de PostgreSQL
    'ANALYZE associates;',
    'ANALYZE doc_contracts;',
    'ANALYZE doc_correspondence;',
    'ANALYZE doc_minutes;',
    'ANALYZE doc_loans;',
    'ANALYZE sig_resultados;',
    'ANALYZE monthly_schedules;',
    'ANALYZE schedule_assignments;',
    'ANALYZE users;',
    'ANALYZE roles;',
    'ANALYZE audit_logs;'
  ];

  for (const sql of performanceSQLs) {
    try {
      await client.query(sql);
      console.log('✓', sql.trim().replace(';', ''));
    } catch (err: any) {
      console.warn('⚠', err.message);
    }
  }

  console.log('\n🎉 ¡Base de datos PostgreSQL optimizada a nivel 10/10!');
  await client.end();
}

main().catch(console.error);
