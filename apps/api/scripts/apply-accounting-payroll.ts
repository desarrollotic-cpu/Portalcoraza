import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function runSqlFile(client: Client, filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);
  console.log(`→ Ejecutando ${name}...`);
  await client.query(sql);
  console.log(`  ✓ ${name}`);
}

async function main() {
  if (!DATABASE_URL) {
    console.error('❌ Falta DATABASE_URL en apps/api/.env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: (DATABASE_URL.includes('supabase') || DATABASE_URL.includes('pooler'))
      ? { rejectUnauthorized: false }
      : false,
  });

  await client.connect();
  console.log('=== Aplicando Migraciones de Nómina, Colillas y Contabilidad NIIF/PUC ===');

  const rootDir = path.join(__dirname, '..', '..', '..');
  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

  const files = [
    '035_accounting_puc.sql',
    '036_accounting_entries.sql',
    '037_payroll_slips.sql',
  ];

  for (const f of files) {
    const p = path.join(migrationsDir, f);
    if (fs.existsSync(p)) {
      await runSqlFile(client, p);
    } else {
      console.warn(`⚠️ No encontrado: ${p}`);
    }
  }

  // Insertar permisos de Nómina y Contabilidad
  console.log('→ Registrando Permisos de Nómina y Contabilidad...');
  await client.query(`
    INSERT INTO permissions (code, name, module, description) VALUES
    ('payroll.view', 'Ver Nómina y Colillas', 'payroll', 'Permite consultar periodos y colillas de pago'),
    ('payroll.calculate', 'Liquidar Nómina', 'payroll', 'Permite ejecutar liquidaciones de nómina'),
    ('payroll.export', 'Exportar Colillas PDF', 'payroll', 'Permite descargar PDF de colillas'),
    ('accounting.view', 'Ver Contabilidad', 'accounting', 'Permite consultar el PUC y asientos contables'),
    ('accounting.manage', 'Gestionar Contabilidad', 'accounting', 'Permite administrar comprobantes contables')
    ON CONFLICT (code) DO NOTHING;

    -- Asignar permisos al rol GERENCIA
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.code = 'GERENCIA' AND p.code IN ('payroll.view', 'payroll.calculate', 'payroll.export', 'accounting.view', 'accounting.manage')
    ON CONFLICT DO NOTHING;
  `);

  console.log('✅ Migraciones y Permisos de Nómina/Contabilidad listos en Supabase.');
  await client.end();
}

main().catch((err) => {
  console.error('❌ Error al aplicar esquema de Nómina y Contabilidad:', err);
  process.exit(1);
});
