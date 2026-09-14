/**
 * Usuario demo del plan de mejora (septiembre):
 * Gestión Humana + Operaciones + Dotación + Control de accesos (Recepción/Minuta lectura ops).
 *
 * Uso: npx ts-node -r dotenv/config scripts/seed-piloto-plan.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const ROLE_CODE = 'PILOTO_PLAN';
const email = (process.env.SEED_PILOTO_EMAIL ?? 'piloto.plan@coraza.local').toLowerCase();
const password = process.env.SEED_PILOTO_PASSWORD ?? 'PilotoPlan2026!';
const fullName = process.env.SEED_PILOTO_NAME ?? 'Piloto Plan Mejora (demo)';

/** Solo los módulos del documento de presentación. */
const PILOTO_PERMISSIONS = [
  // Gestión Humana
  'associates.view',
  'associates.create',
  'associates.edit',
  'associates.retire',
  'job_positions.view',
  'job_positions.create',
  'job_positions.edit',
  'work_centers.view',
  'work_centers.create',
  'work_centers.edit',
  // sin catalogs.* (ocultos en demo plan)
  'retirements.view',
  'retirements.create',
  'retirements.edit',
  'retirements.readmit',
  'hr_documents.view',
  'hr_documents.upload',
  'hr_documents.delete',
  'hr_alerts.view',
  'hr_alerts.resolve',
  'hr_dashboard.view',
  'hr_export.excel',
  'hr_import.execute',
  'hr_sensitive.view',
  'hr_audit.view',
  'absences.view',
  'absences.create',
  'absences.edit',
  'absences.delete',
  'absences.import',
  // Operaciones / puestos / minutas (supervisión)
  'operations.view',
  'posts.view',
  'posts.create',
  'posts.edit',
  'minuta.view',
  'audit.view',
  // Dotación / inventario (“Compras” operativas)
  'inventory.view',
  'inventory.create',
  'inventory.edit',
  'inventory.move',
  'inventory.alerts',
  'deliveries.view',
  'deliveries.create',
  'deliveries.sign',
  'deliveries.revert',
  // Control de accesos — Recepción
  'reception.view',
  'reception.register',
  'reception.exit',
  // Notificaciones básicas
  'notifications.view',
  'notifications.read',
  // Dashboard general (sin users.view / admin)
  'dashboard.view',
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
    await client.query(
      `
      INSERT INTO roles (code, name, description)
      VALUES (
        $1,
        'Piloto plan mejora',
        'Demo: Gestión Humana, Operaciones, Dotación y control de accesos'
      )
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description
    `,
      [ROLE_CODE],
    );

    await client.query(
      `
      INSERT INTO permissions (code, name, module) VALUES
        ('operations.view', 'Ver módulo Operaciones', 'operaciones'),
        ('minuta.view', 'Ver módulo Minuta Virtual (Portal)', 'minuta'),
        ('reception.view', 'Ver panel de recepción', 'recepcion'),
        ('reception.register', 'Registrar visitantes en recepción', 'recepcion'),
        ('reception.exit', 'Registrar salida de visitantes', 'recepcion'),
        ('deliveries.revert', 'Revertir entrega confirmada', 'deliveries'),
        ('dashboard.view', 'Ver dashboard general', 'dashboard')
      ON CONFLICT (code) DO NOTHING
    `,
    );

    // Reemplaza permisos del rol para que quede exacto (sin módulos de segunda mano).
    await client.query(
      `
      DELETE FROM role_permissions rp
      USING roles r
      WHERE rp.role_id = r.id AND r.code = $1
    `,
      [ROLE_CODE],
    );

    const linked = await client.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      CROSS JOIN permissions p
      WHERE r.code = $1
        AND p.code = ANY($2::text[])
      ON CONFLICT DO NOTHING
      RETURNING permission_id
    `,
      [ROLE_CODE, PILOTO_PERMISSIONS],
    );

    const missing = await client.query<{ code: string }>(
      `
      SELECT x.code
      FROM unnest($1::text[]) AS x(code)
      LEFT JOIN permissions p ON p.code = x.code
      WHERE p.id IS NULL
      ORDER BY 1
    `,
      [PILOTO_PERMISSIONS],
    );
    if (missing.rows.length) {
      console.warn('Permisos no encontrados en BD (se omiten):');
      for (const m of missing.rows) console.warn(`  - ${m.code}`);
    }

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = $1 LIMIT 1`,
      [ROLE_CODE],
    );
    if (!role.rows[0]) throw new Error(`No se resolvió el rol ${ROLE_CODE}`);

    let tenantId: string | null = null;
    const t = await client.query<{ id: string }>(
      `SELECT id FROM organizations ORDER BY created_at NULLS LAST LIMIT 1`,
    );
    tenantId = t.rows[0]?.id ?? null;
    if (!tenantId) throw new Error('No hay organizations.id para tenant_id');

    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
      [tenantId, email],
    );

    let userId: string;
    if (existing.rows[0]) {
      const upd = await client.query<{ id: string; email: string }>(
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
      userId = upd.rows[0].id;
      console.log('Usuario PILOTO_PLAN actualizado');
      console.log(`  Email: ${upd.rows[0].email}`);
    } else {
      const ins = await client.query<{ id: string; email: string }>(
        `
        INSERT INTO users (email, password_hash, full_name, role_id, is_active, tenant_id)
        VALUES ($1, $2, $3, $4, TRUE, $5)
        RETURNING id, email
      `,
        [email, passwordHash, fullName, role.rows[0].id, tenantId],
      );
      userId = ins.rows[0].id;
      console.log('Usuario PILOTO_PLAN creado');
      console.log(`  Email: ${ins.rows[0].email}`);
    }

    const perms = await client.query<{ code: string }>(
      `
      SELECT p.code
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = $1
      ORDER BY p.code
    `,
      [ROLE_CODE],
    );

    console.log(`  Password: ${password}`);
    console.log(`  Rol: ${ROLE_CODE}`);
    console.log(`  User id: ${userId}`);
    console.log(`  Permisos vinculados ahora: ${linked.rowCount}`);
    console.log(`  Permisos del rol (${perms.rows.length}):`);
    for (const p of perms.rows) console.log(`    - ${p.code}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
