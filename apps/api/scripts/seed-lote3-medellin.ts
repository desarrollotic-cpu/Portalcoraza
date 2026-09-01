/**
 * Carga Medellín — Camisa hombre + chaleco/chaqueta + accesorios sin talla.
 * Uso: npx ts-node -r dotenv/config scripts/seed-lote3-medellin.ts
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

type VariantSpec = {
  skuSuffix: string;
  talla: string | null;
  genero: 'M' | 'F' | null;
  qty: number;
};

type ItemSpec = {
  code: string;
  name: string;
  category: 'UNI' | 'ACC';
  variants: VariantSpec[];
};

const ITEMS: ItemSpec[] = [
  {
    code: 'CAM001',
    name: 'Camisa',
    category: 'UNI',
    variants: [
      { skuSuffix: 'M-34', talla: '34', genero: 'M', qty: 8 },
      { skuSuffix: 'M-36', talla: '36', genero: 'M', qty: 13 },
      { skuSuffix: 'M-38', talla: '38', genero: 'M', qty: 8 },
      { skuSuffix: 'M-40', talla: '40', genero: 'M', qty: 15 },
      { skuSuffix: 'M-42', talla: '42', genero: 'M', qty: 5 },
      { skuSuffix: 'M-44', talla: '44', genero: 'M', qty: 8 },
      { skuSuffix: 'M-46', talla: '46', genero: 'M', qty: 18 },
      { skuSuffix: 'M-48', talla: '48', genero: 'M', qty: 8 },
      { skuSuffix: 'M-50', talla: '50', genero: 'M', qty: 8 },
    ],
  },
  {
    code: 'CHA001',
    name: 'Chaleco de lona',
    category: 'UNI',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 11 }],
  },
  {
    code: 'IMP001',
    name: 'Chaqueta impermeable',
    category: 'UNI',
    variants: [{ skuSuffix: '36', talla: '36', genero: null, qty: 21 }],
  },
  {
    code: 'CIN001',
    name: 'Cinturón',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 14 }],
  },
  {
    code: 'COR001',
    name: 'Corbatas',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 12 }],
  },
  {
    code: 'CRT001',
    name: 'Corbatín',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 26 }],
  },
  {
    code: 'GOL001',
    name: 'Goleana',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 81 }],
  },
  {
    code: 'KEP001',
    name: 'Kepis',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 0 }],
  },
  {
    code: 'MON001',
    name: 'Moña',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 57 }],
  },
  {
    code: 'REA001',
    name: 'Reata',
    category: 'ACC',
    variants: [{ skuSuffix: 'U', talla: null, genero: null, qty: 39 }],
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
    if (!catMap.get('UNI') || !catMap.get('ACC')) {
      throw new Error('Faltan categorías UNI o ACC');
    }

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
        const sku = `${spec.code}-${v.skuSuffix}`;
        const genderLabel =
          v.genero === 'F' ? 'Mujer' : v.genero === 'M' ? 'Hombre' : null;
        const labelParts = [
          genderLabel,
          v.talla ? `talla ${v.talla}` : 'sin talla',
        ].filter(Boolean);
        const obsLabel = labelParts.join(' · ');

        let variant = await client.query<{ id: string }>(
          `SELECT id FROM inventory_variants WHERE sku = $1 LIMIT 1`,
          [sku],
        );

        if (!variant.rows[0]) {
          const attrs: Record<string, string> = {};
          if (genderLabel) attrs.genero = genderLabel;
          if (v.talla) attrs.talla = v.talla;
          variant = await client.query<{ id: string }>(
            `INSERT INTO inventory_variants
               (item_id, sku, attributes, talla, color, genero, stock_current)
             VALUES ($1, $2, $3::jsonb, $4, NULL, $5, 0)
             RETURNING id`,
            [
              itemId,
              sku,
              JSON.stringify(attrs),
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
                `Inventario inicial Medellín — ${obsLabel}`,
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
                `Inventario inicial Medellín — ${obsLabel} (antes ${current})`,
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
    console.log('\nListo: lote 3 Medellín (camisa H + accesorios).');
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
