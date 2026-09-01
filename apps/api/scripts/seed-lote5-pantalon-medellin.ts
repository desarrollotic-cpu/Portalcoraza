/**
 * Carga Medellín — Pantalón mujer + hombre.
 * Uso: npx ts-node -r dotenv/config scripts/seed-lote5-pantalon-medellin.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

type VariantSpec = { talla: string; genero: 'M' | 'F'; qty: number };

const ITEM = {
  code: 'PAN001',
  name: 'Pantalón',
  category: 'UNI' as const,
  variants: [
    // Mujer
    { talla: '8', genero: 'F' as const, qty: 33 },
    { talla: '10', genero: 'F' as const, qty: 14 },
    { talla: '2', genero: 'F' as const, qty: 5 }, // tal como indicó; confirmar si era 20
    { talla: '12', genero: 'F' as const, qty: 50 },
    { talla: '14', genero: 'F' as const, qty: 6 },
    { talla: '16', genero: 'F' as const, qty: 0 },
    { talla: '18', genero: 'F' as const, qty: 6 },
    { talla: '28', genero: 'F' as const, qty: 0 },
    // Hombre
    { talla: '28', genero: 'M' as const, qty: 22 },
    { talla: '32', genero: 'M' as const, qty: 2 },
    { talla: '34', genero: 'M' as const, qty: 8 },
    { talla: '36', genero: 'M' as const, qty: 8 },
    { talla: '38', genero: 'M' as const, qty: 16 },
    { talla: '40', genero: 'M' as const, qty: 36 },
    { talla: '42', genero: 'M' as const, qty: 8 },
    { talla: '44', genero: 'M' as const, qty: 39 },
    { talla: '46', genero: 'M' as const, qty: 45 },
    { talla: '48', genero: 'M' as const, qty: 13 },
    { talla: '50', genero: 'M' as const, qty: 10 },
  ] satisfies VariantSpec[],
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

    const wh = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM inventory_warehouses WHERE code = 'MEDELLIN' LIMIT 1`,
    );
    if (!wh.rows[0]) throw new Error('No existe almacén MEDELLIN');
    const warehouseId = wh.rows[0].id;
    console.log(`Almacén: ${wh.rows[0].name}`);

    const cat = await client.query<{ id: string }>(
      `SELECT id FROM inventory_categories WHERE code = 'UNI' LIMIT 1`,
    );
    if (!cat.rows[0]) throw new Error('Falta categoría UNI');
    const categoryId = cat.rows[0].id;

    const user = await client.query<{ id: string }>(
      `SELECT id FROM users
       WHERE warehouse_id = $1 OR email ILIKE 'almacen@%'
       ORDER BY CASE WHEN warehouse_id = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [warehouseId],
    );
    const performedBy = user.rows[0]?.id ?? null;

    const allWh = await client.query<{ id: string }>(
      `SELECT id FROM inventory_warehouses`,
    );

    let item = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM inventory_items
       WHERE UPPER(code) = $1 OR LOWER(name) = LOWER($2)
       LIMIT 1`,
      [ITEM.code, ITEM.name],
    );

    if (!item.rows[0]) {
      item = await client.query<{ id: string; code: string }>(
        `INSERT INTO inventory_items
           (category_id, code, name, unit, low_stock_threshold, created_by, updated_by)
         VALUES ($1, $2, $3, 'und', 2, $4, $4)
         RETURNING id, code`,
        [categoryId, ITEM.code, ITEM.name, performedBy],
      );
      console.log(`\n✓ Ítem creado: ${ITEM.code} — ${ITEM.name}`);
    } else {
      console.log(`\n✓ Ítem ya existía: ${item.rows[0].code} — ${ITEM.name}`);
    }

    const itemId = item.rows[0].id;

    for (const v of ITEM.variants) {
      const genderLabel = v.genero === 'F' ? 'Mujer' : 'Hombre';
      const sku = `${ITEM.code}-${v.genero}-${v.talla}`;
      let variant = await client.query<{ id: string }>(
        `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
        [sku],
      );

      if (!variant.rows[0]) {
        variant = await client.query<{ id: string }>(
          `INSERT INTO inventory_variants
             (item_id, sku, attributes, talla, color, genero, stock_current)
           VALUES ($1, $2, $3::jsonb, $4, NULL, $5, 0)
           RETURNING id`,
          [
            itemId,
            sku,
            JSON.stringify({ genero: genderLabel, talla: v.talla }),
            v.talla,
            v.genero,
          ],
        );
        console.log(`  + ${sku}`);
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

      if (current !== v.qty) {
        await client.query(
          `UPDATE inventory_stock
           SET quantity = $3, updated_at = NOW()
           WHERE variant_id = $1 AND warehouse_id = $2`,
          [variantId, warehouseId, v.qty],
        );

        if (current === 0 && v.qty > 0) {
          await client.query(
            `INSERT INTO inventory_movements
               (variant_id, movement_type, quantity, entry_reason, observations, reason,
                warehouse_id, performed_by)
             VALUES ($1, 'IN', $2, 'Ajuste', $3, $4, $5, $6)`,
            [
              variantId,
              v.qty,
              `Inventario inicial Medellín — ${genderLabel} talla ${v.talla}`,
              `Ajuste — Inventario inicial Medellín`,
              warehouseId,
              performedBy,
            ],
          );
        } else if (!(current === 0 && v.qty === 0)) {
          await client.query(
            `INSERT INTO inventory_movements
               (variant_id, movement_type, quantity, entry_reason, observations, reason,
                warehouse_id, performed_by)
             VALUES ($1, 'ADJ', $2, 'Ajuste', $3, $4, $5, $6)`,
            [
              variantId,
              v.qty,
              `Inventario inicial Medellín — ${genderLabel} talla ${v.talla} (antes ${current})`,
              `Ajuste — Inventario inicial Medellín`,
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

      console.log(`  ✓ ${sku}: M ${v.qty}`);
    }

    await client.query('COMMIT');
    console.log('\nListo: Pantalón Medellín.');
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
