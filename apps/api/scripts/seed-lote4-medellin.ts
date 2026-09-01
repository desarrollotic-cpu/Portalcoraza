/**
 * Carga Medellín — Chaqueta impermeable (más tallas) + Overall.
 * Uso: npx ts-node -r dotenv/config scripts/seed-lote4-medellin.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

type VariantSpec = { talla: string; qty: number };

type ItemSpec = {
  code: string;
  name: string;
  category: 'UNI' | 'ACC';
  variants: VariantSpec[];
};

const ITEMS: ItemSpec[] = [
  {
    code: 'IMP001',
    name: 'Chaqueta impermeable',
    category: 'UNI',
    variants: [
      { talla: '38', qty: 16 },
      { talla: '40', qty: 14 },
      { talla: '42', qty: 14 },
      { talla: '44', qty: 15 },
    ],
  },
  {
    code: 'OVE001',
    name: 'Overall',
    category: 'UNI',
    variants: [
      { talla: '36', qty: 5 },
      { talla: '38', qty: 14 },
      { talla: '40', qty: 15 },
      { talla: '42', qty: 14 },
      { talla: '44', qty: 16 },
      { talla: '46', qty: 28 },
      { talla: '48', qty: 5 },
      { talla: '50', qty: 8 },
    ],
  },
];

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

    const cats = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM inventory_categories WHERE code IN ('UNI','ACC')`,
    );
    const catMap = new Map(cats.rows.map((c) => [c.code, c.id]));
    if (!catMap.get('UNI')) throw new Error('Falta categoría UNI');

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

    for (const spec of ITEMS) {
      const categoryId = catMap.get(spec.category)!;
      let item = await client.query<{ id: string; code: string }>(
        `SELECT id, code FROM inventory_items
         WHERE UPPER(code) = $1 OR LOWER(name) = LOWER($2)
         LIMIT 1`,
        [spec.code, spec.name],
      );

      if (!item.rows[0]) {
        item = await client.query<{ id: string; code: string }>(
          `INSERT INTO inventory_items
             (category_id, code, name, unit, low_stock_threshold, created_by, updated_by)
           VALUES ($1, $2, $3, 'und', 2, $4, $4)
           RETURNING id, code`,
          [categoryId, spec.code, spec.name, performedBy],
        );
        console.log(`\n✓ Ítem creado: ${spec.code} — ${spec.name}`);
      } else {
        console.log(`\n✓ Ítem ya existía: ${item.rows[0].code} — ${spec.name}`);
      }

      const itemId = item.rows[0].id;

      for (const v of spec.variants) {
        const sku = `${spec.code}-${v.talla}`;
        let variant = await client.query<{ id: string }>(
          `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
          [sku],
        );

        if (!variant.rows[0]) {
          variant = await client.query<{ id: string }>(
            `INSERT INTO inventory_variants
               (item_id, sku, attributes, talla, color, genero, stock_current)
             VALUES ($1, $2, $3::jsonb, $4, NULL, NULL, 0)
             RETURNING id`,
            [itemId, sku, JSON.stringify({ talla: v.talla }), v.talla],
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
                `Inventario inicial Medellín — talla ${v.talla}`,
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
                `Inventario inicial Medellín — talla ${v.talla} (antes ${current})`,
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
    }

    await client.query('COMMIT');
    console.log('\nListo: impermeable + overall Medellín.');
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
