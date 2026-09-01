/**
 * Verifica stock pantalón hombre talla 28 Medellín.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
    const r = await client.query<{ sku: string; quantity: number }>(
      `SELECT v.sku, s.quantity
       FROM inventory_variants v
       JOIN inventory_stock s ON s.variant_id = v.id
       JOIN inventory_warehouses w ON w.id = s.warehouse_id
       WHERE v.sku = 'PAN001-M-28' AND w.code = 'MEDELLIN'`,
    );
    console.log(r.rows[0] ?? 'NO ENCONTRADO');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
