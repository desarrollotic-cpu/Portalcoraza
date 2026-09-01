/**
 * Carga Medellín — Apellidos (parche uniforme), stock 0.
 * Uso: npx ts-node -r dotenv/config scripts/seed-apellidos-medellin.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ITEM_NAME = 'Apellidos';
const ITEM_CODE = 'APE001';
const SKU = 'APE001-U';

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
    await client.query('BEGIN');

    const wh = await client.query<{ id: string; name: string; code: string }>(
      `SELECT id, name, code FROM inventory_warehouses WHERE code = 'MEDELLIN' LIMIT 1`,
    );
    if (!wh.rows[0]) throw new Error('No existe almacén MEDELLIN');
    const warehouseId = wh.rows[0].id;
    console.log(`Almacén: ${wh.rows[0].name}`);

    const cat = await client.query<{ id: string }>(
      `SELECT id FROM inventory_categories WHERE code = 'UNI' LIMIT 1`,
    );
    if (!cat.rows[0]) throw new Error('No existe categoría UNI');
    const categoryId = cat.rows[0].id;

    const user = await client.query<{ id: string }>(
      `SELECT id FROM users
       WHERE warehouse_id = $1 OR email ILIKE 'almacen@%'
       ORDER BY CASE WHEN warehouse_id = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [warehouseId],
    );
    const performedBy = user.rows[0]?.id ?? null;

    let item = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM inventory_items
       WHERE UPPER(code) = $1 OR LOWER(name) = LOWER($2)
       LIMIT 1`,
      [ITEM_CODE, ITEM_NAME],
    );

    if (!item.rows[0]) {
      item = await client.query<{ id: string; code: string }>(
        `INSERT INTO inventory_items
           (category_id, code, name, unit, low_stock_threshold, created_by, updated_by)
         VALUES ($1, $2, $3, 'und', 0, $4, $4)
         RETURNING id, code`,
        [categoryId, ITEM_CODE, ITEM_NAME, performedBy],
      );
      console.log(`✓ Ítem creado: ${ITEM_CODE} — ${ITEM_NAME}`);
    } else {
      console.log(`✓ Ítem ya existía: ${item.rows[0].code}`);
    }

    let variant = await client.query<{ id: string }>(
      `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
      [SKU],
    );

    if (!variant.rows[0]) {
      variant = await client.query<{ id: string }>(
        `INSERT INTO inventory_variants
           (item_id, sku, attributes, talla, color, genero, stock_current)
         VALUES ($1, $2, $3::jsonb, NULL, NULL, NULL, 0)
         RETURNING id`,
        [item.rows[0].id, SKU, JSON.stringify({ tipo: 'parche_apellido' })],
      );
      console.log(`  + Variante ${SKU}`);
    }

    const variantId = variant.rows[0].id;
    const allWh = await client.query<{ id: string }>(
      `SELECT id FROM inventory_warehouses`,
    );
    for (const w of allWh.rows) {
      await client.query(
        `INSERT INTO inventory_stock (variant_id, warehouse_id, quantity)
         VALUES ($1, $2, 0)
         ON CONFLICT (variant_id, warehouse_id) DO NOTHING`,
        [variantId, w.id],
      );
    }

    await client.query(
      `UPDATE inventory_stock SET quantity = 0, updated_at = NOW()
       WHERE variant_id = $1 AND warehouse_id = $2`,
      [variantId, warehouseId],
    );
    await client.query(
      `UPDATE inventory_variants SET stock_current = 0, updated_at = NOW() WHERE id = $1`,
      [variantId],
    );

    await client.query('COMMIT');
    console.log('✓ Apellidos: Medellín = 0 · Rionegro = 0');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
