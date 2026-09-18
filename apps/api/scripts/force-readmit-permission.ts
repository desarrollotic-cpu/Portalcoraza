/**
 * Aplicar YA el permiso retirements.readmit en la base sin esperar el deploy del API.
 * Reproduce el contenido de supabase/migrations/071_perm_retirements_readmit.sql.
 */
import * as dns from 'dns';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no configurada');
  const client = new Client({ connectionString: url });
  await client.connect();

  console.log('▶ Aplicando permiso retirements.readmit ...');

  await client.query('BEGIN');
  try {
    await client.query(`
      INSERT INTO permissions (code, name, module)
      VALUES ('retirements.readmit', 'Reingresar asociado (RETIRADO/INACTIVO)', 'hr')
      ON CONFLICT (code) DO NOTHING
    `);

    const assigned = await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code IN ('GERENCIA', 'RRHH')
        AND p.code = 'retirements.readmit'
      ON CONFLICT DO NOTHING
      RETURNING role_id
    `);

    await client.query('COMMIT');

    const check = await client.query(`
      SELECT r.code AS rol, p.code AS permiso
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'retirements.readmit'
      ORDER BY r.code
    `);

    console.log(`✔ Filas nuevas en role_permissions: ${assigned.rowCount}`);
    console.log(`✔ Roles con el permiso ahora:`);
    for (const r of check.rows) console.log(`   • ${r.rol}`);

    if (check.rows.length === 0) {
      console.log('⚠  Ningún rol quedó con el permiso. ¿Existen los roles GERENCIA/RRHH?');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('✖ Error:', err);
  process.exit(1);
});
