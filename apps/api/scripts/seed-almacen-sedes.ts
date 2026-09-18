/**
 * Usuarios ALMACENISTA por sede: Medellín y Rionegro.
 * Uso: npx ts-node scripts/seed-almacen-sedes.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const SEDES = [
  {
    code: 'MEDELLIN',
    email: 'almacen.medellin@corazaseguridadcta.com',
    password: 'AlmacenMed2026!',
    fullName: 'Almacenista Medellín',
  },
  {
    code: 'RIONEGRO',
    email: 'almacen.rionegro@corazaseguridadcta.com',
    password: 'AlmacenRio2026!',
    fullName: 'Almacenista Rionegro',
  },
] as const;

async function upsertUser(
  client: Client,
  opts: {
    email: string;
    passwordHash: string;
    fullName: string;
    roleId: string;
    warehouseId: string;
    tenantId: string | null;
  },
) {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = $1 LIMIT 1`,
    [opts.email],
  );
  if (existing.rows[0]) {
    await client.query(
      `UPDATE users
       SET password_hash = $1, full_name = $2, role_id = $3, warehouse_id = $4,
           is_active = TRUE, updated_at = NOW()
       WHERE id = $5`,
      [opts.passwordHash, opts.fullName, opts.roleId, opts.warehouseId, existing.rows[0].id],
    );
    return;
  }
  if (opts.tenantId) {
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, warehouse_id, tenant_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
      [opts.email, opts.passwordHash, opts.fullName, opts.roleId, opts.warehouseId, opts.tenantId],
    );
  } else {
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role_id, warehouse_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      [opts.email, opts.passwordHash, opts.fullName, opts.roleId, opts.warehouseId],
    );
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta DATABASE_URL en apps/api/.env');

  const client = new Client({
    connectionString: url,
    ssl:
      url.includes('supabase') || url.includes('pooler')
        ? { rejectUnauthorized: false }
        : undefined,
  });
  await client.connect();

  try {
    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'ALMACENISTA' LIMIT 1`,
    );
    if (!role.rows[0]) throw new Error('Falta rol ALMACENISTA');

    const tenant = await client.query<{ tenant_id: string }>(
      `SELECT tenant_id FROM users WHERE tenant_id IS NOT NULL LIMIT 1`,
    );
    const tenantId = tenant.rows[0]?.tenant_id ?? null;

    for (const sede of SEDES) {
      const wh = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM inventory_warehouses WHERE code = $1 LIMIT 1`,
        [sede.code],
      );
      if (!wh.rows[0]) throw new Error(`Falta almacén ${sede.code}`);

      const passwordHash = await bcrypt.hash(sede.password, 12);
      await upsertUser(client, {
        email: sede.email,
        passwordHash,
        fullName: sede.fullName,
        roleId: role.rows[0].id,
        warehouseId: wh.rows[0].id,
        tenantId,
      });

      const check = await client.query<{ email: string; warehouse: string }>(
        `SELECT u.email, w.name AS warehouse
         FROM users u
         JOIN inventory_warehouses w ON w.id = u.warehouse_id
         WHERE lower(u.email) = $1`,
        [sede.email],
      );
      console.log(`Listo ${check.rows[0]?.warehouse}: ${sede.email} / ${sede.password}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
