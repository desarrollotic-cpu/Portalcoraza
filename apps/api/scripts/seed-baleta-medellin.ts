/**
 * Carga inicial Medellín — prueba: Baleta negra dama (tallas 34–39).
 *
 * Uso (desde apps/api):
 *   npx ts-node -r dotenv/config scripts/seed-baleta-medellin.ts
 *
 * Idempotente: si el ítem/variante ya existe, deja el stock Medellín en el valor indicado.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ITEM_NAME = 'Baleta negra dama';
const ITEM_CODE = 'BAL001';
const COLOR = 'Negra';
const GENERO = 'F';

/** Talla → cantidad en Medellín */
const STOCK: Record<string, number> = {
  '34': 6,
  '35': 9,
  '36': 5,
  '37': 5,
  '38': 3,
  '39': 0,
};

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

    const wh = await client.query<{ id: string; code: string; name: string }>(
      `SELECT id, code, name FROM inventory_warehouses WHERE code = 'MEDELLIN' LIMIT 1`,
    );
    if (!wh.rows[0]) throw new Error('No existe almacén MEDELLIN');
    const warehouseId = wh.rows[0].id;
    console.log(`Almacén: ${wh.rows[0].name} (${wh.rows[0].code})`);

    const cat = await client.query<{ id: string }>(
      `SELECT id FROM inventory_categories WHERE code = 'UNI' LIMIT 1`,
    );
    if (!cat.rows[0]) throw new Error('No existe categoría UNI (Uniforme). Corre seed:inventory-categories');
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
      const ins = await client.query<{ id: string; code: string }>(
        `INSERT INTO inventory_items
           (category_id, code, name, unit, low_stock_threshold, created_by, updated_by)
         VALUES ($1, $2, $3, 'und', 2, $4, $4)
         RETURNING id, code`,
        [categoryId, ITEM_CODE, ITEM_NAME, performedBy],
      );
      item = ins;
      console.log(`✓ Ítem creado: ${ITEM_CODE} — ${ITEM_NAME}`);
    } else {
      console.log(`✓ Ítem ya existía: ${item.rows[0].code}`);
    }
    const itemId = item.rows[0].id;

    const allWh = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM inventory_warehouses`,
    );

    for (const [talla, qty] of Object.entries(STOCK)) {
      const sku = `${ITEM_CODE}-${GENERO}-${talla}`;
      let variant = await client.query<{ id: string }>(
        `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
        [sku],
      );

      if (!variant.rows[0]) {
        const attrs = JSON.stringify({
          genero: 'Mujer',
          talla,
          color: COLOR,
        });
        const insV = await client.query<{ id: string }>(
          `INSERT INTO inventory_variants
             (item_id, sku, attributes, talla, color, genero, stock_current)
           VALUES ($1, $2, $3::jsonb, $4, $5, $6, 0)
           RETURNING id`,
          [itemId, sku, attrs, talla, COLOR, GENERO],
        );
        variant = insV;
        console.log(`  + Variante ${sku}`);
      }

      const variantId = variant.rows[0].id;

      for (const w of allWh.rows) {
        await client.query(
          `INSERT INTO inventory_stock (variant_id, warehouse_id, quantity)
           VALUES ($1, $2, 0)
           ON CONFLICT (variant_id, warehouse_id) DO NOTHING`,
          [variantId, w.id],
        );
      }

      const cur = await client.query<{ quantity: number }>(
        `SELECT quantity FROM inventory_stock
         WHERE variant_id = $1 AND warehouse_id = $2`,
        [variantId, warehouseId],
      );
      const current = Number(cur.rows[0]?.quantity ?? 0);

      if (current !== qty) {
        await client.query(
          `UPDATE inventory_stock
           SET quantity = $3, updated_at = NOW()
           WHERE variant_id = $1 AND warehouse_id = $2`,
          [variantId, warehouseId, qty],
        );

        // Movimiento de auditoría (solo si hay cambio real)
        if (current === 0 && qty > 0) {
          await client.query(
            `INSERT INTO inventory_movements
               (variant_id, movement_type, quantity, entry_reason, observations, reason,
                warehouse_id, performed_by)
             VALUES ($1, 'IN', $2, 'Ajuste', $3, $4, $5, $6)`,
            [
              variantId,
              qty,
              `Inventario inicial Medellín — talla ${talla}`,
              `Ajuste — Inventario inicial Medellín — talla ${talla}`,
              warehouseId,
              performedBy,
            ],
          );
        } else {
          // ADJ: quantity = stock objetivo (como hace la API)
          await client.query(
            `INSERT INTO inventory_movements
               (variant_id, movement_type, quantity, entry_reason, observations, reason,
                warehouse_id, performed_by)
             VALUES ($1, 'ADJ', $2, 'Ajuste', $3, $4, $5, $6)`,
            [
              variantId,
              qty,
              `Inventario inicial Medellín — talla ${talla} (antes ${current})`,
              `Ajuste — Inventario inicial Medellín — talla ${talla}`,
              warehouseId,
              performedBy,
            ],
          );
        }
      }

      await client.query(
        `UPDATE inventory_variants v
         SET stock_current = COALESCE((
           SELECT SUM(s.quantity)::int FROM inventory_stock s WHERE s.variant_id = v.id
         ), 0),
         updated_at = NOW()
         WHERE v.id = $1`,
        [variantId],
      );

      console.log(`  ✓ ${sku}: Medellín = ${qty}`);
    }

    await client.query('COMMIT');
    console.log('\nListo. Revisa en Dotación → Inventario (filtro Medellín).');
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
