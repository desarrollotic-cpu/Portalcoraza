const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

async function checkPermissions() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const role = await client.query("SELECT id, code, name FROM roles WHERE code = 'AUDITOR'");
  console.log('Role:', role.rows[0]);

  if (role.rows[0]) {
    const perms = await client.query(`
      SELECT p.code, p.name, p.module
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.code
    `, [role.rows[0].id]);
    console.log(`Permisos asignados al AUDITOR (${perms.rows.length}):`, perms.rows.map(r => r.code));
  }

  // Let's check all permissions in the system to see what exists
  const allPerms = await client.query('SELECT code, module FROM permissions ORDER BY code');
  console.log(`Total permisos en el sistema (${allPerms.rows.length}):`, allPerms.rows.map(r => r.code));

  await client.end();
}

checkPermissions().catch(console.error);
