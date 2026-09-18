import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedSampleInspection() {
  const url = process.env.DATABASE_URL || 'postgresql://postgres.duxpqkldgdnfcabpkogl:26Hh9rwHQGPiBNSC@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Check if inspections already exist
  const inspCount = await client.query(`SELECT COUNT(*)::int as count FROM sst_inspections`);
  if (inspCount.rows[0].count > 0) {
    console.log('Ya existen inspecciones en la base de datos:', inspCount.rows[0].count);
    await client.end();
    return;
  }

  // Obtener puesto
  const wpRes = await client.query(`SELECT id, nombre FROM sst_workplaces LIMIT 1`);
  if (wpRes.rows.length === 0) {
    console.error('No hay puestos registrados.');
    await client.end();
    return;
  }
  const workplaceId = wpRes.rows[0].id;
  console.log('Usando puesto:', wpRes.rows[0].nombre, workplaceId);

  // Obtener usuario SST
  const userRes = await client.query(`SELECT id, full_name FROM users WHERE email = 'sst@corazaseguridadcta.com'`);
  const inspector = userRes.rows[0];

  // Obtener items del checklist
  const itemsRes = await client.query(`SELECT id, codigo, categoria, pregunta FROM sst_checklist_items ORDER BY sort_order ASC`);
  const items = itemsRes.rows;

  console.log(`Creando IPT inicial para puesto con ${items.length} ítems...`);

  // Crear inspección
  const inspRes = await client.query(`
    INSERT INTO sst_inspections (
      workplace_id,
      tipo,
      fecha,
      responsable_nombre,
      responsable_cargo,
      inspector_user_id,
      estado,
      observaciones_generales,
      cumplimiento_global,
      nivel_riesgo
    ) VALUES (
      $1,
      'IPT_INICIAL',
      CURRENT_DATE,
      $2,
      'Especialista SST',
      $3,
      'COMPLETADA',
      'Inspección periódica inicial realizada en puesto Portería. Se identifican 2 hallazgos menores con plan de acción correctivo asignado.',
      93.94,
      'BAJO'
    ) RETURNING id
  `, [workplaceId, inspector?.full_name || 'Especialista SST Coraza', inspector?.id || null]);

  const inspectionId = inspRes.rows[0].id;

  // Insertar respuestas para los 34 items
  for (const item of items) {
    let valoracion = 'SEGURO';
    let hallazgo = null;
    let plan = null;
    let responsable = null;
    let fechaCompromiso = null;
    let estadoPlan = null;

    if (item.codigo === 7) {
      // Escalones y rampas
      valoracion = 'RIESGOSO';
      hallazgo = 'Cintas antideslizantes de la rampa de acceso principal presentan desgaste por tráfico continuo.';
      plan = 'Instalar nuevas cintas antideslizantes de alta resistencia en escalón y rampa de acceso.';
      responsable = 'Mantenimiento / Operaciones';
      fechaCompromiso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      estadoPlan = 'ABIERTO';
    } else if (item.codigo === 16) {
      // Silla ergonomica
      valoracion = 'RIESGOSO';
      hallazgo = 'Graduación neumática de la silla de puesto portería presenta holgura.';
      plan = 'Mantenimiento y ajuste de soporte lumbar y pistón neumático de la silla.';
      responsable = 'Dotación / SST';
      fechaCompromiso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      estadoPlan = 'ABIERTO';
    } else if (item.codigo === 27) {
      // Biológico
      valoracion = 'N_A';
    }

    await client.query(`
      INSERT INTO sst_responses (
        inspection_id,
        item_id,
        valoracion,
        hallazgo,
        plan_accion_propuesto,
        responsable_plan_accion,
        fecha_compromiso,
        estado_plan_accion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      inspectionId,
      item.id,
      valoracion,
      hallazgo,
      plan,
      responsable,
      fechaCompromiso,
      estadoPlan,
    ]);
  }

  console.log('✓ Inspección IPT inicial creada con éxito ID:', inspectionId);

  await client.end();
}

seedSampleInspection().catch(console.error);
