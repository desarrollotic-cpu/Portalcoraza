/**
 * Aplica migración 014 (campos persistentes inventario) + seed categorías.
 * Uso: npm run db:apply-inventory -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runFile(client: Client, rel: string) {
  const file = path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', rel);
  if (!fs.existsSync(file)) {
    throw new Error(`No existe ${file}`);
  }
  console.log('→', rel);
  await client.query(fs.readFileSync(file, 'utf8'));
  console.log('✓', rel);
}

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
    // 013 es solo categorías; 014 incluye categorías + columnas nuevas
    await runFile(client, '013_inventory_categories_seed.sql');
    await runFile(client, '014_inventory_persist_fields.sql');

    const cats = await client.query(
      `SELECT code, name FROM inventory_categories ORDER BY name`,
    );
    const cols = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'inventory_movements'
        AND column_name IN ('entry_reason', 'observations', 'reason', 'quantity')
      ORDER BY column_name
    `);
    const vcols = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'inventory_variants'
        AND column_name IN ('talla', 'color', 'genero', 'sku', 'stock_current', 'attributes')
      ORDER BY column_name
    `);
    console.log('Categorías:', cats.rows.map((r) => `${r.code}=${r.name}`).join(', '));
    console.log('Movimientos cols:', cols.rows.map((r) => r.column_name).join(', '));
    console.log('Variantes cols:', vcols.rows.map((r) => r.column_name).join(', '));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
