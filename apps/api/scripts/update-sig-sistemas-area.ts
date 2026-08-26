import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    console.log('1. Actualizando Check Constraint con SISTEMAS (Seguridad Electrónica / Sistemas)...');
    await client.query(`
      ALTER TABLE sig_indicadores DROP CONSTRAINT IF EXISTS sig_indicadores_area_check;
      ALTER TABLE sig_indicadores ADD CONSTRAINT sig_indicadores_area_check 
        CHECK (area IN ('GH', 'SST', 'OPERACIONES', 'SISTEMAS', 'COMERCIAL', 'ADMIN', 'DOTACION', 'DOCUMENTAL', 'RECEPCION', 'CALIDAD'));
    `);

    console.log('2. Asignando I1, I2, I3, I4 al área SISTEMAS (Seguridad Electrónica & Ciberseguridad)...');
    await client.query(`
      UPDATE sig_indicadores
      SET area = 'SISTEMAS'
      WHERE codigo IN ('I1', 'I2', 'I3', 'I4');
    `);

    const res = await client.query(`
      SELECT area, COUNT(*) as total
      FROM sig_indicadores
      GROUP BY area
      ORDER BY area;
    `);
    console.table(res.rows);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
