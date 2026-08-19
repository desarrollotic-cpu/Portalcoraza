import { DataSource } from 'typeorm';

async function batchInsert(dst: DataSource, table: string, columns: string[], rows: any[][], chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const paramPlaceholders: string[] = [];
    const params: any[] = [];
    let pCount = 1;

    for (const row of chunk) {
      const rowPlaceholders = row.map((val) => {
        params.push(val);
        return `$${pCount++}`;
      });
      paramPlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${paramPlaceholders.join(', ')}
      ON CONFLICT DO NOTHING
    `;

    await dst.query(query, params);
  }
}

async function main() {
  console.log('🚀 Starting Fast Batch Data Migration for Gestión Documental...');

  const src = new DataSource({
    type: 'postgres',
    host: 'aws-1-us-west-2.pooler.supabase.com',
    port: 5432,
    username: 'postgres.vufieahhfixyloykvsdb',
    password: 'Freider1004*',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  const dst = new DataSource({
    type: 'postgres',
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 5432,
    username: 'postgres.duxpqkldgdnfcabpkogl',
    password: '26Hh9rwHQGPiBNSC',
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  await src.initialize();
  await dst.initialize();
  console.log('✅ Connected to both Source and Target databases.\n');

  // Ensure default document type
  let docTypes = await dst.query(`SELECT id FROM document_types LIMIT 1`);
  let defaultDocTypeId: string;
  if (docTypes.length > 0) {
    defaultDocTypeId = docTypes[0].id;
  } else {
    const newType = await dst.query(`
      INSERT INTO document_types (code, name, description) 
      VALUES ('GENERAL', 'Documento General', 'Categoría general para documentos migrados')
      RETURNING id
    `);
    defaultDocTypeId = newType[0].id;
  }

  // 1. personal_inactivo (3,835 rows)
  console.log('1/8 Migrating personal_inactivo -> doc_retired_personnel...');
  const inactivos = await src.query(`SELECT * FROM personal_inactivo`);
  const inactivosRows = inactivos.map((r: any) => [
    r.nombre_completo || 'Sin nombre',
    r.cedula || null,
    r.fecha_baja ? new Date(r.fecha_baja) : null,
    r.motivo_baja || null,
    r.observaciones || null,
    r.tipo_persona || null,
    r.codigo_numerico || null,
    r.voxelsera || null,
    r.fecha_registro ? new Date(r.fecha_registro) : new Date(),
  ]);
  await batchInsert(dst, 'doc_retired_personnel', ['full_name', 'id_number', 'retirement_date', 'retirement_reason', 'observations', 'person_type', 'numeric_code', 'voxelsera', 'created_at'], inactivosRows);
  console.log(`✅ Migrated ${inactivosRows.length} rows to doc_retired_personnel.`);

  // 2. minutas (2,096 rows)
  console.log('2/8 Migrating minutas -> doc_minutes...');
  const minutas = await src.query(`SELECT * FROM minutas`);
  const minutasRows = minutas.map((r: any) => [
    r.tipo_minuta || 'general',
    r.nombre_puesto || 'Puesto General',
    r.fecha_inicio ? new Date(r.fecha_inicio) : null,
    r.fecha_cierre ? new Date(r.fecha_cierre) : null,
    r.observaciones || null,
    r.estado || 'activa',
    r.codigo_unico || null,
    r.codigo_numerico || null,
    r.voxelsera || null,
    r.fecha_registro ? new Date(r.fecha_registro) : new Date(),
  ]);
  await batchInsert(dst, 'doc_minutes', ['minute_type', 'post_name', 'start_date', 'close_date', 'observations', 'status', 'unique_code', 'numeric_code', 'voxelsera', 'created_at'], minutasRows);
  console.log(`✅ Migrated ${minutasRows.length} rows to doc_minutes.`);

  // 3. correspondencia (903 rows)
  console.log('3/8 Migrating correspondencia -> doc_correspondence...');
  const correspondencia = await src.query(`SELECT * FROM correspondencia`);
  const corrRows = correspondencia.map((r: any) => [
    r.codigo_documento || null,
    r.codigo_numerico || null,
    r.fecha_documento ? new Date(r.fecha_documento) : null,
    r.medio || 'digital',
    r.tipo_documento || 'correspondencia',
    r.depto_origen || null,
    r.depto_destino || null,
    r.asunto || null,
    r.detalle || null,
    r.estado || 'recibido',
    r.voxelsera || null,
    r.fecha_registro ? new Date(r.fecha_registro) : new Date(),
  ]);
  await batchInsert(dst, 'doc_correspondence', ['document_code', 'numeric_code', 'document_date', 'medium', 'document_type', 'origin_dept', 'destination_dept', 'subject', 'detail', 'status', 'voxelsera', 'created_at'], corrRows);
  console.log(`✅ Migrated ${corrRows.length} rows to doc_correspondence.`);

  // 4. contratos (714 rows)
  console.log('4/8 Migrating contratos -> doc_contracts...');
  const contratos = await src.query(`SELECT * FROM contratos`);
  const contratosRows = contratos.map((r: any) => [
    r.tipo_contrato || 'General',
    r.numero_contrato || null,
    r.codigo_numerico || null,
    r.parte_a || null,
    r.parte_b || null,
    r.nit || null,
    r.fecha_inicio ? new Date(r.fecha_inicio) : null,
    r.fecha_fin ? new Date(r.fecha_fin) : null,
    r.valor_contrato ? Number(r.valor_contrato) : null,
    r.objeto_contrato || null,
    r.estado || 'activo',
    r.voxelsera || null,
    r.hoja_origen || null,
    r.fecha_registro ? new Date(r.fecha_registro) : new Date(),
  ]);
  await batchInsert(dst, 'doc_contracts', ['contract_type', 'contract_number', 'numeric_code', 'party_a', 'party_b', 'nit', 'start_date', 'end_date', 'contract_value', 'contract_object', 'status', 'voxelsera', 'source_sheet', 'created_at'], contratosRows);
  console.log(`✅ Migrated ${contratosRows.length} rows to doc_contracts.`);

  // 5. prestamos (5 rows)
  console.log('5/8 Migrating prestamos -> doc_loans...');
  const prestamos = await src.query(`SELECT * FROM prestamos`);
  const prestamosRows = prestamos.map((r: any) => [
    r.solicitante || 'General',
    r.departamento || null,
    r.documento || null,
    r.codigo_documento || null,
    r.fecha_prestamo ? new Date(r.fecha_prestamo) : null,
    r.fecha_devolucion ? new Date(r.fecha_devolucion) : null,
    r.fecha_devolucion_real ? new Date(r.fecha_devolucion_real) : null,
    r.estado || 'prestado',
    new Date(),
  ]);
  await batchInsert(dst, 'doc_loans', ['requester', 'department', 'document', 'document_code', 'loan_date', 'return_date', 'real_return_date', 'status', 'created_at'], prestamosRows);
  console.log(`✅ Migrated ${prestamosRows.length} rows to doc_loans.`);

  // 6. tabla_trd (5 rows)
  console.log('6/8 Migrating tabla_trd -> doc_retention_table...');
  const trd = await src.query(`SELECT * FROM tabla_trd`);
  const trdRows = trd.map((r: any) => [
    r.codigo_dep || null,
    r.nombre_dep || null,
    r.codigo_serie || null,
    r.nombre_serie || null,
    r.codigo_subserie || null,
    r.nombre_subserie || null,
    r.tiempo_gestion_anos || 0,
    r.tiempo_central_anos || 0,
    r.disposicion_final || null,
    r.normativa_base || null,
    new Date(),
  ]);
  await batchInsert(dst, 'doc_retention_table', ['dependency_code', 'dependency_name', 'series_code', 'series_name', 'subseries_code', 'subseries_name', 'management_years', 'central_years', 'final_disposition', 'legal_basis', 'created_at'], trdRows);
  console.log(`✅ Migrated ${trdRows.length} rows to doc_retention_table.`);

  // 7. archivo_fisico (462 rows)
  console.log('7/8 Migrating archivo_fisico -> document_records...');
  const fisico = await src.query(`SELECT * FROM archivo_fisico`);
  const fisicoRows = fisico.map((r: any) => [
    r.codigo_busqueda || r.id_documento || null,
    defaultDocTypeId,
    r.tipo_documento || 'Documento Físico',
    r.ubicacion || null,
    r.descripcion || null,
    r.fecha_archivo ? new Date(r.fecha_archivo) : null,
    new Date(),
  ]);
  await batchInsert(dst, 'document_records', ['code', 'document_type_id', 'title', 'physical_location', 'observations', 'registered_at', 'created_at'], fisicoRows);
  console.log(`✅ Migrated ${fisicoRows.length} rows to document_records.`);

  // 8. biblioteca_carpetas (4 rows)
  console.log('8/8 Migrating biblioteca_carpetas -> doc_library_folders...');
  const carpetas = await src.query(`SELECT * FROM biblioteca_carpetas`);
  const carpetasRows = carpetas.map((r: any) => [
    r.nombre || 'Carpeta',
    r.color || '#3b82f6',
    r.es_sistema || false,
    r.fecha_registro ? new Date(r.fecha_registro) : new Date(),
  ]);
  await batchInsert(dst, 'doc_library_folders', ['name', 'color', 'is_system', 'created_at'], carpetasRows);
  console.log(`✅ Migrated ${carpetasRows.length} rows to doc_library_folders.`);

  await src.destroy();
  await dst.destroy();
  console.log('\n🎉🎉🎉 MIGRATION COMPLETED 100% SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
