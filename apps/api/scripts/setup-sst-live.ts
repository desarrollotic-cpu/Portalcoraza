import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';
import * as bcrypt from 'bcrypt';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function setupSst() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log('--- 1. Verificando permisos y roles SST ---');
  // 1. Permisos
  await client.query(`
    INSERT INTO permissions (code, name, module) VALUES
      ('sst.view', 'Ver módulo SST / IPT', 'sst'),
      ('sst.inspect', 'Crear y editar inspecciones IPT', 'sst'),
      ('sst.manage', 'Gestionar clientes, puestos y catálogo SST', 'sst'),
      ('sst.alerts', 'Ver alertas críticas de reincidencia SST', 'sst')
    ON CONFLICT (code) DO NOTHING;
  `);

  // 2. Rol INSPECTOR_SST
  await client.query(`
    INSERT INTO roles (code, name, description)
    VALUES ('INSPECTOR_SST', 'Inspector SST', 'Inspecciones IPT y gestión de SST')
    ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
  `);

  // 3. Asignar todos los permisos SST a INSPECTOR_SST, ADMIN, SUPERADMIN, GERENCIA
  await client.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.code IN ('INSPECTOR_SST', 'GERENCIA', 'ADMIN', 'SUPERADMIN')
      AND p.code IN ('sst.view', 'sst.inspect', 'sst.manage', 'sst.alerts')
    ON CONFLICT DO NOTHING;
  `);

  // 4. Asignar sst.view a AUDITOR
  await client.query(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.code = 'AUDITOR'
      AND p.code IN ('sst.view', 'sst.alerts')
    ON CONFLICT DO NOTHING;
  `);

  console.log('--- 2. Verificando o creando cliente y puestos base ---');
  // Verificar cliente
  let clientRes = await client.query(`SELECT id FROM sst_clients LIMIT 1`);
  let clientId: string;
  if (clientRes.rows.length === 0) {
    const newClient = await client.query(`
      INSERT INTO sst_clients (nombre, nit, contacto, telefono)
      VALUES ('Coraza Seguridad C.T.A.', '811.023.456-1', 'Coordinación SST', '3001234567')
      RETURNING id;
    `);
    clientId = newClient.rows[0].id;
    console.log('Cliente SST creado:', clientId);
  } else {
    clientId = clientRes.rows[0].id;
    console.log('Cliente SST existente:', clientId);
  }

  // Verificar puestos
  const wpRes = await client.query(`SELECT COUNT(*)::int as count FROM sst_workplaces`);
  if (wpRes.rows[0].count === 0) {
    await client.query(`
      INSERT INTO sst_workplaces (client_id, nombre, ciudad, tipo_puesto, direccion)
      VALUES
        ($1, 'Sede Principal — Portería', 'Medellín', 'PORTERIA', 'Calle 50 # 45-20'),
        ($1, 'Sede Principal — Recepción', 'Medellín', 'RECEPCION', 'Calle 50 # 45-20 Piso 1'),
        ($1, 'Centro de Control — CCTV', 'Medellín', 'CCTV', 'Calle 50 # 45-20 Piso 2'),
        ($1, 'Puesto Perimetral — Ronda Externa', 'Medellín', 'PERIMETRO', 'Sector Sur')
    `, [clientId]);
    console.log('Puestos SST base creados (4 puestos)');
  } else {
    console.log(`Ya existen ${wpRes.rows[0].count} puestos SST`);
  }

  console.log('--- 3. Verificando usuario de SST ---');
  // Buscar rol INSPECTOR_SST id
  const roleRes = await client.query(`SELECT id FROM roles WHERE code = 'INSPECTOR_SST'`);
  const inspectorRoleId = roleRes.rows[0]?.id;

  const userRes = await client.query(`SELECT id, email FROM users WHERE email = 'sst@corazaseguridadcta.com'`);
  const passwordHash = await bcrypt.hash('Coraza2026!', 12);

  if (userRes.rows.length === 0) {
    await client.query(`
      INSERT INTO users (email, password_hash, full_name, role_id, is_active)
      VALUES ('sst@corazaseguridadcta.com', $1, 'Especialista SST Coraza', $2, true)
    `, [passwordHash, inspectorRoleId]);
    console.log('Usuario sst@corazaseguridadcta.com creado con contraseña Coraza2026!');
  } else {
    await client.query(`
      UPDATE users
      SET password_hash = $1, role_id = $2, is_active = true, full_name = 'Especialista SST Coraza'
      WHERE email = 'sst@corazaseguridadcta.com'
    `, [passwordHash, inspectorRoleId]);
    console.log('Usuario sst@corazaseguridadcta.com actualizado con rol INSPECTOR_SST y contraseña Coraza2026!');
  }

  // Comprobar catálogo de items
  const itemsRes = await client.query(`SELECT COUNT(*)::int as count FROM sst_checklist_items`);
  console.log(`Checklist items en BD: ${itemsRes.rows[0].count}`);

  const workplacesList = await client.query(`SELECT id, nombre, tipo_puesto FROM sst_workplaces`);
  console.log('Puestos disponibles:', workplacesList.rows);

  await client.end();
  console.log('--- Configuración de SST completada con éxito ---');
}

setupSst().catch(console.error);
