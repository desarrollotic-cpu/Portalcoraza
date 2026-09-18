import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verify() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const insp = await client.query(`
    SELECT i.id, i.fecha, i.tipo, i.estado, i.cumplimiento_global, i.nivel_riesgo, w.nombre as puesto, c.nombre as cliente
    FROM sst_inspections i
    JOIN sst_workplaces w ON w.id = i.workplace_id
    JOIN sst_clients c ON c.id = w.client_id
  `);
  console.log('Inspections in DB:', insp.rows);

  const plans = await client.query(`
    SELECT r.id, i.fecha, item.categoria, item.pregunta, r.valoracion, r.hallazgo, r.plan_accion_propuesto, r.estado_plan_accion
    FROM sst_responses r
    JOIN sst_inspections i ON i.id = r.inspection_id
    JOIN sst_checklist_items item ON item.id = r.item_id
    WHERE r.estado_plan_accion IS NOT NULL
  `);
  console.log('Action plans in DB:', plans.rows);

  const sstUser = await client.query(`
    SELECT u.id, u.email, u.full_name, r.code as role_code, r.name as role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.email = 'sst@corazaseguridadcta.com'
  `);
  console.log('SST User:', sstUser.rows);

  await client.end();
}

verify().catch(console.error);
