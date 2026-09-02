/**
 * Inspecciona el puesto 937 (URBANIZACION LLANO AZUL CASAS) en la BD
 * para verificar que todos los campos del archivo quedaron cargados.
 */
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url = process.env.DATABASE_URL!;
  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const r = await client.query(`SELECT * FROM posts WHERE code = '937' LIMIT 1`);
    if (!r.rows.length) {
      console.log('No hay puesto con code=937');
      return;
    }
    const p = r.rows[0];
    const keys = Object.keys(p).sort();
    console.log(`Puesto ${p.code} — ${p.name}`);
    console.log('='.repeat(70));
    for (const k of keys) {
      const v = p[k];
      const shown =
        v === null ? '(null)' :
        v instanceof Date ? v.toISOString().slice(0, 10) :
        typeof v === 'string' && v.length > 100 ? v.slice(0, 100) + '…' :
        String(v);
      console.log(`  ${k.padEnd(38)} ${shown}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
