/**
 * Aplica migración 035 (almacenes Medellín/Rionegro) y crea el usuario de Rionegro.
 * Uso: npm run db:apply-warehouses -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as bcrypt from 'bcrypt';
import { Client } from 'pg';

const MED_EMAIL = (
  process.env.SEED_ALMACENISTA_EMAIL ?? 'almacen@corazaseguridadcta.com'
).toLowerCase();
const RIO_EMAIL = (
  process.env.SEED_ALMACEN_RIONEGRO_EMAIL ?? 'almacen.rionegro@corazaseguridadcta.com'
).toLowerCase();
const RIO_PASSWORD = process.env.SEED_ALMACEN_RIONEGRO_PASSWORD ?? 'AlmacenRio2026!';
const RIO_NAME = process.env.SEED_ALMACEN_RIONEGRO_NAME ?? 'Almacenista Rionegro';

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
    const file = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'supabase',
      'migrations',
      '035_inventory_warehouses.sql',
    );
    console.log('→ 035_inventory_warehouses.sql');
    await client.query(fs.readFileSync(file, 'utf8'));
    console.log('✓ migración 035');

    const warehouses = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM inventory_warehouses ORDER BY code`,
    );
    const med = warehouses.rows.find((w) => w.code === 'MEDELLIN');
    const rio = warehouses.rows.find((w) => w.code === 'RIONEGRO');
    if (!med || !rio) {
      throw new Error('No se resolvieron almacenes MEDELLIN/RIONEGRO');
    }

    await client.query(
      `UPDATE users SET warehouse_id = $1, full_name = COALESCE(full_name, 'Almacenista Medellín'), updated_at = NOW()
       WHERE lower(email) = $2`,
      [med.id, MED_EMAIL],
    );

    const role = await client.query<{ id: string }>(
      `SELECT id FROM roles WHERE code = 'ALMACENISTA' LIMIT 1`,
    );
    if (!role.rows[0]) {
      throw new Error('Falta rol ALMACENISTA');
    }

    const passwordHash = await bcrypt.hash(RIO_PASSWORD, 12);
    await client.query(
      `
      INSERT INTO users (email, password_hash, full_name, role_id, warehouse_id, is_active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            role_id = EXCLUDED.role_id,
            warehouse_id = EXCLUDED.warehouse_id,
            is_active = TRUE,
            updated_at = NOW()
      `,
      [RIO_EMAIL, passwordHash, RIO_NAME, role.rows[0].id, rio.id],
    );

    const stock = await client.query(
      `SELECT COUNT(*)::int AS n FROM inventory_stock`,
    );
    const items = await client.query(
      `SELECT code FROM inventory_items WHERE code IN ('CAMISA','PANTALON','BOTAS') ORDER BY code`,
    );

    console.log('Almacenes:', warehouses.rows.map((w) => w.code).join(', '));
    console.log(`Usuario Medellín: ${MED_EMAIL} → ${med.code}`);
    console.log(`Usuario Rionegro: ${RIO_EMAIL} / ${RIO_PASSWORD} → ${rio.code}`);
    console.log('Elementos seed:', items.rows.map((r) => r.code).join(', ') || '(ninguno)');
    console.log('Filas inventory_stock:', stock.rows[0]?.n);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
