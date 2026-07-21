/**
 * Siembra categorías de inventario usadas en Dotación (paridad app almacén).
 * Uso: npm run seed:inventory-categories -w @coraza/api
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CATEGORIES = [
  { code: 'UNI', name: 'Uniforme', description: 'Prendas de uniforme' },
  { code: 'ACC', name: 'Accesorio', description: 'Accesorios de dotación' },
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
    for (const c of CATEGORIES) {
      await client.query(
        `
        INSERT INTO inventory_categories (code, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              updated_at = NOW()
        `,
        [c.code, c.name, c.description],
      );
      console.log(`✓ ${c.code} — ${c.name}`);
    }

    const { rows } = await client.query(
      `SELECT code, name FROM inventory_categories ORDER BY name`,
    );
    console.log('Categorías disponibles:', rows.map((r) => r.name).join(', '));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
