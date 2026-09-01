/**
 * Corrige pantalón mujer Medellín según confirmación JHON.
 * Uso: npx ts-node -r dotenv/config scripts/fix-pantalon-mujer-medellin.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/** Tallas correctas mujer */
const KEEP: { talla: string; qty: number }[] = [
  { talla: '8', qty: 33 },
  { talla: '10', qty: 14 },
  { talla: '12', qty: 50 },
  { talla: '14', qty: 6 },
  { talla: '16', qty: 0 },
  { talla: '18', qty: 6 },
  { talla: '20', qty: 0 },
];

/** Variantes erróneas a eliminar (stock a 0 + soft variant) */
const REMOVE_SKUS = ['PAN001-F-2', 'PAN001-F-28'];

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

    const wh = await client.query<{ id: string }>(
      `SELECT id FROM inventory_warehouses WHERE code = 'MEDELLIN' LIMIT 1`,
    );
    if (!wh.rows[0]) throw new Error('No existe almacén MEDELLIN');
    const warehouseId = wh.rows[0].id;

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

    const item = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM inventory_items
       WHERE UPPER(code) IN ('PAN001','PANTALON') OR LOWER(name) = 'pantalón' OR LOWER(name) = 'pantalon'
       LIMIT 1`,
    );
    if (!item.rows[0]) throw new Error('No existe ítem Pantalón');
    const itemId = item.rows[0].id;
    console.log(`Ítem: ${item.rows[0].code}`);

    // Upsert tallas correctas
    for (const v of KEEP) {
      const sku = `PAN001-F-${v.talla}`;
      let variant = await client.query<{ id: string }>(
        `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
        [sku],
      );

      if (!variant.rows[0]) {
        variant = await client.query<{ id: string }>(
          `INSERT INTO inventory_variants
             (item_id, sku, attributes, talla, color, genero, stock_current)
           VALUES ($1, $2, $3::jsonb, $4, NULL, 'F', 0)
           RETURNING id`,
          [
            itemId,
            sku,
            JSON.stringify({ genero: 'Mujer', talla: v.talla }),
            v.talla,
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
        await client.query(
          `INSERT INTO inventory_movements
             (variant_id, movement_type, quantity, entry_reason, observations, reason,
              warehouse_id, performed_by)
           VALUES ($1, 'ADJ', $2, 'Ajuste', $3, $4, $5, $6)`,
          [
            variantId,
            v.qty,
            `Corrección pantalón mujer Medellín — talla ${v.talla} (antes ${current})`,
            `Ajuste — Corrección inventario Medellín`,
            warehouseId,
            performedBy,
          ],
        );
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

    // Quitar tallas erróneas
    for (const sku of REMOVE_SKUS) {
      const variant = await client.query<{ id: string }>(
        `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
        [sku],
      );
      if (!variant.rows[0]) {
        console.log(`  (no existía ${sku})`);
        continue;
      }
      const variantId = variant.rows[0].id;

      await client.query(
        `UPDATE inventory_stock SET quantity = 0, updated_at = NOW() WHERE variant_id = $1`,
        [variantId],
      );
      await client.query(
        `DELETE FROM inventory_movements WHERE variant_id = $1`,
        [variantId],
      );
      await client.query(
        `DELETE FROM inventory_stock WHERE variant_id = $1`,
        [variantId],
      );
      await client.query(`DELETE FROM inventory_variants WHERE id = $1`, [
        variantId,
      ]);
      console.log(`  ✗ eliminada ${sku}`);
    }

    await client.query('COMMIT');
    console.log('\nListo: pantalón mujer corregido.');
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
