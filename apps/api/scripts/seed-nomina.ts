/**
 * Crea (o actualiza) el usuario de Nómina: consulta RRHH en solo lectura + ver Nómina.
 * Incluye permisos .view necesarios para filtros (cargos, centros, catálogos).
 *
 * Uso: npm run seed:nomina -w @coraza/api
 *
 * Variables opcionales:
 *   SEED_NOMINA_EMAIL / SEED_NOMINA_PASSWORD / SEED_NOMINA_NAME
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const email = (process.env.SEED_NOMINA_EMAIL ?? 'nomina@corazaseguridadcta.com').toLowerCase();
const password = process.env.SEED_NOMINA_PASSWORD ?? 'Nomina2026!';
const fullName = process.env.SEED_NOMINA_NAME ?? 'Nómina Coraza';

/** Solo lectura RRHH + ver nómina. Sin crear/editar/retirar/importar ni datos sensibles. */
const NOMINA_PERMISSIONS = [
  'associates.view',
  'job_positions.view',
  'work_centers.view',
  'catalogs.view',
  'retirements.view',
  'hr_documents.view',
  'hr_alerts.view',
  'hr_dashboard.view',
  'hr_compliance.view',
  'hr_audit.view',
  'absences.view',
  'payroll.view',
  'notifications.view',
  'notifications.read',
];

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
    await client.query(`
      INSERT INTO roles (code, name, description)
      VALUES (
        'NOMINA',
        'Nómina',
        'Consulta de Gestión Humana (solo lectura) y módulo de Nómina'
      )
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(`
      INSERT INTO permissions (code, name, module) VALUES
        ('associates.view', 'Consultar asociados', 'associates'),
        ('job_positions.view', 'Ver cargos', 'hr'),
        ('work_centers.view', 'Ver centros de trabajo', 'hr'),
        ('catalogs.view', 'Ver catálogos HR', 'hr'),
        ('retirements.view', 'Ver retiros', 'hr'),
        ('hr_documents.view', 'Ver documentos de asociado', 'hr'),
        ('hr_alerts.view', 'Ver alertas HRM', 'hr'),
        ('hr_dashboard.view', 'Ver dashboard HRM', 'hr'),
        ('hr_compliance.view', 'Ver matriz de cumplimiento SST', 'hr'),
        ('hr_audit.view', 'Ver bitácora HRM', 'hr'),
        ('absences.view', 'Ver ausentismo', 'hr'),
        ('payroll.view', 'Ver Nómina y Colillas', 'payroll'),
        ('notifications.view', 'Ver notificaciones', 'notifications'),
        ('notifications.read', 'Marcar notificaciones como leidas', 'notifications')
      ON CONFLICT (code) DO NOTHING
    `);

    // Quitar permisos de escritura si el rol ya existía con más alcance.
    await client.query(`
      DELETE FROM role_permissions rp
      USING roles r, permissions p
      WHERE rp.role_id = r.id
        AND rp.permission_id = p.id
        AND r.code = 'NOMINA'
        AND NOT (p.code = ANY($1::text[]))
    `, [NOMINA_PERMISSIONS]);

    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'NOMINA'
        AND p.code = ANY($1::text[])
      ON CONFLICT DO NOTHING
    `,
      [NOMINA_PERMISSIONS],
    );

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'NOMINA' LIMIT 1`,
    );
    if (!role.rows[0]) {
      throw new Error('No se pudo resolver el rol NOMINA');
    }

    const org = await client.query<{ id: string }>(
      `SELECT id FROM organizations ORDER BY created_at NULLS LAST LIMIT 1`,
    );
    const tenantId = org.rows[0]?.id ?? null;

    const passwordHash = await bcrypt.hash(password, 12);
    let upsert;

    if (tenantId) {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
        [tenantId, email],
      );
      if (existing.rows[0]) {
        upsert = await client.query(
          `
          UPDATE users
          SET password_hash = $1,
              full_name = $2,
              role_id = $3,
              is_active = TRUE,
              updated_at = NOW()
          WHERE id = $4
          RETURNING id, email
        `,
          [passwordHash, fullName, role.rows[0].id, existing.rows[0].id],
        );
      } else {
        upsert = await client.query(
          `
          INSERT INTO users (email, password_hash, full_name, role_id, is_active, tenant_id)
          VALUES ($1, $2, $3, $4, TRUE, $5)
          RETURNING id, email
        `,
          [email, passwordHash, fullName, role.rows[0].id, tenantId],
        );
      }
    } else {
      upsert = await client.query(
        `
        INSERT INTO users (email, password_hash, full_name, role_id, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (email) DO UPDATE
          SET password_hash = EXCLUDED.password_hash,
              full_name = EXCLUDED.full_name,
              role_id = EXCLUDED.role_id,
              is_active = TRUE,
              updated_at = NOW()
        RETURNING id, email
      `,
        [email, passwordHash, fullName, role.rows[0].id],
      );
    }

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'NOMINA'
      ORDER BY p.code
    `,
    );

    console.log('Usuario NOMINA listo');
    console.log(`  Email: ${upsert.rows[0].email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol: NOMINA (solo lectura RRHH + ver Nómina)`);
    console.log(`  Permisos (${perms.rows.length}):`);
    for (const p of perms.rows) {
      console.log(`    - ${p.code}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
