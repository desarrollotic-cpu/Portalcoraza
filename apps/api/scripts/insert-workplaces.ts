import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function insertWorkplaces() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'sst_workplaces'
  `);
  console.log('Columns of sst_workplaces:', cols.rows);

  const clientId = '1dd5ea4d-3bd6-4928-a95a-fdb3617f0457';
  const res = await client.query(`
    INSERT INTO sst_workplaces (client_id, nombre, ciudad, tipo_puesto, direccion)
    VALUES
      ($1, 'Sede Principal — Portería', 'Medellín', 'PORTERIA', 'Calle 50 # 45-20'),
      ($1, 'Sede Principal — Recepción', 'Medellín', 'RECEPCION', 'Calle 50 # 45-20 Piso 1'),
      ($1, 'Centro de Control — CCTV', 'Medellín', 'CCTV', 'Calle 50 # 45-20 Piso 2'),
      ($1, 'Puesto Perimetral — Ronda Externa', 'Medellín', 'PERIMETRO', 'Sector Sur')
    RETURNING id, nombre;
  `, [clientId]);

  console.log('Inserted workplaces:', res.rows);

  await client.end();
}

insertWorkplaces().catch(console.error);
