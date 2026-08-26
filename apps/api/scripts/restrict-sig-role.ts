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
    console.log('Restringiendo permisos del rol SIG exclusivamente a sig.view...');
    
    // 1. Limpiar todos los permisos actuales del rol SIG
    await client.query(`
      DELETE FROM role_permissions rp
      USING roles r
      WHERE rp.role_id = r.id
        AND r.code = 'SIG';
    `);

    // 2. Asignar EXCLUSIVAMENTE sig.view
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.code = 'SIG'
        AND p.code = 'sig.view'
      ON CONFLICT DO NOTHING;
    `);

    const check = await client.query(`
      SELECT r.code, r.name, p.code as permission_code
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.code = 'SIG';
    `);

    console.log('Permisos asignados al rol SIG:');
    console.log(check.rows);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
