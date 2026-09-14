/**
 * Crea permiso hr_compliance.view (Matriz SST) y lo da a roles con hr_dashboard,
 * excepto PILOTO_PLAN (demo plan mejora sin matriz).
 *
 * Uso: npx ts-node -r dotenv/config scripts/apply-hr-compliance-perm.ts
 */
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
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();
  try {
    await client.query(`
      INSERT INTO permissions (code, name, module)
      VALUES ('hr_compliance.view', 'Ver matriz de cumplimiento SST', 'hr')
      ON CONFLICT (code) DO NOTHING
    `);

    const granted = await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT DISTINCT r.id, p.id
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions pd ON pd.id = rp.permission_id AND pd.code = 'hr_dashboard.view'
      CROSS JOIN permissions p
      WHERE p.code = 'hr_compliance.view'
        AND r.code <> 'PILOTO_PLAN'
      ON CONFLICT DO NOTHING
      RETURNING role_id
    `);

    const revoked = await client.query(`
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.code = 'PILOTO_PLAN'
        AND p.code = 'hr_compliance.view'
      RETURNING r.code
    `);

    const check = await client.query<{ code: string; has_compliance: boolean }>(`
      SELECT r.code,
        EXISTS (
          SELECT 1 FROM role_permissions rp
          JOIN permissions p ON p.id = rp.permission_id
          WHERE rp.role_id = r.id AND p.code = 'hr_compliance.view'
        ) AS has_compliance
      FROM roles r
      WHERE r.code IN ('GERENCIA', 'RRHH', 'PILOTO_PLAN', 'AUDITOR')
      ORDER BY r.code
    `);

    console.log(`Permiso hr_compliance.view listo. Altas nuevas: ${granted.rowCount}`);
    console.log(`Revocados PILOTO_PLAN: ${revoked.rowCount}`);
    for (const row of check.rows) {
      console.log(`  ${row.code}: matriz=${row.has_compliance ? 'SÍ' : 'NO'}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
