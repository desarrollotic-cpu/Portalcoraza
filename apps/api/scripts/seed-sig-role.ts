import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL en apps/api/.env');
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

  try {
    console.log('Insertando rol Sistema de Gestión (SIG)...');
    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES (
        'SIG',
        'Sistema de Gestión',
        'Gestión Integral de Calidad, Indicadores SIG-KPI, SST, Procesos y Auditoría'
      )
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;
    `);

    console.log('Asignando permisos al rol SIG...');
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.code = 'SIG'
        AND (
          p.code LIKE 'sig.%'
          OR p.code LIKE 'sst.%'
          OR p.code LIKE 'documental.%'
          OR p.code LIKE '%.view'
          OR p.code IN (
            'inventory.alerts',
            'hr_alerts.view',
            'hr_dashboard.view',
            'hr_audit.view',
            'hr_export.excel',
            'audit.view'
          )
        )
      ON CONFLICT DO NOTHING;
    `);

    // Consulta de verificación
    const res = await client.query(`
      SELECT r.id, r.code, r.name, COUNT(rp.permission_id) as total_perms
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      WHERE r.code = 'SIG'
      GROUP BY r.id, r.code, r.name;
    `);
    console.log('Rol SIG listo en Base de Datos:', res.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error aplicando rol SIG:', err);
  process.exit(1);
});
