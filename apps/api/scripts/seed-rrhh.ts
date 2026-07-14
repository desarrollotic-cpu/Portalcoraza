/**
 * Crea (o actualiza) el usuario de Recursos Humanos con rol RRHH.
 * Funcionalidad alineada a docs/EXPOSICION_GESTION_HUMANA_2026-07-16.md:
 *   crear, editar, retirar, importar Excel, ver datos sensibles Ley 1581.
 *
 * Uso: npm run seed:rrhh -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const email = (process.env.SEED_RRHH_EMAIL ?? 'rrhh@coraza.local').toLowerCase();
const password = process.env.SEED_RRHH_PASSWORD ?? 'Rrhh2026!';
const fullName = process.env.SEED_RRHH_NAME ?? 'Recursos Humanos Coraza';

/** Permisos del perfil RRHH (seeds 001 + 003 + 004). Sin Dotación/Programación/Admin. */
const RRHH_PERMISSIONS = [
  // Asociados
  'associates.view',
  'associates.create',
  'associates.edit',
  'associates.retire',
  // Puestos / auditoría operativa
  'posts.view',
  'audit.view',
  // Cargos, centros, catálogos
  'job_positions.view',
  'job_positions.create',
  'job_positions.edit',
  'work_centers.view',
  'work_centers.create',
  'work_centers.edit',
  'catalogs.view',
  'catalogs.manage',
  // Retiros / reingreso
  'retirements.view',
  'retirements.create',
  'retirements.edit',
  'retirements.readmit',
  // Documentos HR
  'hr_documents.view',
  'hr_documents.upload',
  'hr_documents.delete',
  // Alertas / panel / Excel
  'hr_alerts.view',
  'hr_alerts.resolve',
  'hr_dashboard.view',
  'hr_export.excel',
  'hr_import.execute',
  // Ley 1581 + bitácora
  'hr_sensitive.view',
  'hr_audit.view',
  // Ausentismo (paridad GESTION-HUMANA)
  'absences.view',
  'absences.create',
  'absences.edit',
  'absences.delete',
  'absences.import',
  // Documental (consulta) + notificaciones
  'documental.view',
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
      VALUES ('RRHH', 'Recursos Humanos', 'Gestión de asociados')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(`
      INSERT INTO permissions (code, name, module) VALUES
        ('associates.view', 'Consultar asociados', 'associates'),
        ('associates.create', 'Crear asociado', 'associates'),
        ('associates.edit', 'Editar asociado', 'associates'),
        ('associates.retire', 'Retirar asociado', 'associates'),
        ('posts.view', 'Ver puestos', 'posts'),
        ('audit.view', 'Ver auditoría', 'audit'),
        ('job_positions.view', 'Ver cargos', 'hr'),
        ('job_positions.create', 'Crear cargos', 'hr'),
        ('job_positions.edit', 'Editar cargos', 'hr'),
        ('work_centers.view', 'Ver centros de trabajo', 'hr'),
        ('work_centers.create', 'Crear centros de trabajo', 'hr'),
        ('work_centers.edit', 'Editar centros de trabajo', 'hr'),
        ('catalogs.view', 'Ver catálogos HR', 'hr'),
        ('catalogs.manage', 'Gestionar catálogos HR', 'hr'),
        ('retirements.view', 'Ver retiros', 'hr'),
        ('retirements.create', 'Registrar retiro', 'hr'),
        ('retirements.edit', 'Editar retiro', 'hr'),
        ('retirements.readmit', 'Readmitir asociado', 'hr'),
        ('hr_documents.view', 'Ver documentos de asociado', 'hr'),
        ('hr_documents.upload', 'Cargar documentos de asociado', 'hr'),
        ('hr_documents.delete', 'Eliminar documentos de asociado', 'hr'),
        ('hr_alerts.view', 'Ver alertas HRM', 'hr'),
        ('hr_alerts.resolve', 'Resolver alertas HRM', 'hr'),
        ('hr_dashboard.view', 'Ver dashboard HRM', 'hr'),
        ('hr_export.excel', 'Exportar reportes Excel', 'hr'),
        ('hr_import.execute', 'Importar planillas Excel', 'hr'),
        ('hr_sensitive.view', 'Ver datos sensibles Ley 1581', 'hr'),
        ('hr_audit.view', 'Ver bitácora HRM', 'hr'),
        ('absences.view', 'Ver ausentismo', 'hr'),
        ('absences.create', 'Crear ausencias', 'hr'),
        ('absences.edit', 'Editar ausencias', 'hr'),
        ('absences.delete', 'Eliminar ausencias', 'hr'),
        ('absences.import', 'Importar ausentismo Excel', 'hr'),
        ('documental.view', 'Ver documental', 'documental'),
        ('notifications.view', 'Ver notificaciones', 'notifications'),
        ('notifications.read', 'Marcar notificaciones como leidas', 'notifications')
      ON CONFLICT (code) DO NOTHING
    `);

    await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = 'RRHH'
        AND p.code = ANY($1::text[])
      ON CONFLICT DO NOTHING
    `,
      [RRHH_PERMISSIONS],
    );

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'RRHH' LIMIT 1`,
    );
    if (!role.rows[0]) {
      throw new Error('No se pudo resolver el rol RRHH');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const upsert = await client.query(
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

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'RRHH'
      ORDER BY p.code
    `,
    );

    console.log('Usuario RRHH listo');
    console.log(`  Email: ${upsert.rows[0].email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Rol: RRHH`);
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
