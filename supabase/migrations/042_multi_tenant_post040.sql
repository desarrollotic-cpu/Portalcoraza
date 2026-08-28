-- 042_multi_tenant_post040.sql
-- tenant_id + RLS en tablas creadas después de 040 (Minuta, SIG, SST, Nómina, Contabilidad, Inventario, Vigía)
-- Idempotente: reutiliza helpers _mt_add_tenant_id / _mt_enable_rls

BEGIN;

CREATE OR REPLACE FUNCTION _mt_add_tenant_id(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RAISE NOTICE 'skip missing table: %', p_table;
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID',
    p_table
  );

  EXECUTE format(
    'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL',
    p_table,
    '11111111-1111-1111-1111-111111111111'
  );

  EXECUTE format(
    'ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL',
    p_table
  );

  EXECUTE format(
    'ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT %L',
    p_table,
    '11111111-1111-1111-1111-111111111111'
  );

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = format('%s_tenant_fk', p_table)
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES organizations(id)',
      p_table,
      format('%s_tenant_fk', p_table)
    );
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)',
    format('idx_%s_tenant', p_table),
    p_table
  );
END;
$$;

-- Minuta virtual
SELECT _mt_add_tenant_id('minuta_visitantes');
SELECT _mt_add_tenant_id('minuta_correspondencia');
SELECT _mt_add_tenant_id('minuta_contratistas');
SELECT _mt_add_tenant_id('minuta_domiciliarios');
SELECT _mt_add_tenant_id('minuta_incidentes');
SELECT _mt_add_tenant_id('minuta_servicio');
SELECT _mt_add_tenant_id('minuta_entrega_puesto');

-- Inventario almacenes
SELECT _mt_add_tenant_id('inventory_warehouses');
SELECT _mt_add_tenant_id('inventory_stock');

-- Contabilidad / PUC
SELECT _mt_add_tenant_id('puc_accounts');
SELECT _mt_add_tenant_id('accounting_entries');
SELECT _mt_add_tenant_id('accounting_entry_details');

-- SIG
SELECT _mt_add_tenant_id('sig_sistemas');
SELECT _mt_add_tenant_id('sig_objetivos');
SELECT _mt_add_tenant_id('sig_indicadores');
SELECT _mt_add_tenant_id('sig_resultados');

-- SST
SELECT _mt_add_tenant_id('sst_clients');
SELECT _mt_add_tenant_id('sst_workplaces');
SELECT _mt_add_tenant_id('sst_checklist_items');
SELECT _mt_add_tenant_id('sst_inspections');
SELECT _mt_add_tenant_id('sst_responses');
SELECT _mt_add_tenant_id('sst_evidences');

-- Nómina
SELECT _mt_add_tenant_id('payroll_periods');
SELECT _mt_add_tenant_id('payroll_slips');
SELECT _mt_add_tenant_id('payroll_slip_details');

-- Vigía (app móvil; sin API Nest aún)
SELECT _mt_add_tenant_id('vigia_turnos');
SELECT _mt_add_tenant_id('vigia_sos');
SELECT _mt_add_tenant_id('vigia_consignas');
SELECT _mt_add_tenant_id('vigia_minutas');
SELECT _mt_add_tenant_id('vigia_nomina');
SELECT _mt_add_tenant_id('vigia_nomina_reclamos');
SELECT _mt_add_tenant_id('vigia_dotacion_firmas');
SELECT _mt_add_tenant_id('vigia_pins');

-- Índices únicos compuestos (best-effort)
CREATE OR REPLACE FUNCTION _mt_try_unique_index(p_index_name TEXT, p_sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'skip unique index % (duplicate data)', p_index_name;
  WHEN duplicate_table THEN
    RAISE NOTICE 'index already exists %', p_index_name;
  WHEN OTHERS THEN
    RAISE NOTICE 'skip unique index %: %', p_index_name, SQLERRM;
END;
$$;

DO $$ BEGIN ALTER TABLE inventory_warehouses DROP CONSTRAINT IF EXISTS inventory_warehouses_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS inventory_warehouses_code_key;
SELECT _mt_try_unique_index(
  'uq_inventory_warehouses_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_warehouses_tenant_code ON inventory_warehouses (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE sig_sistemas DROP CONSTRAINT IF EXISTS sig_sistemas_nombre_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS sig_sistemas_nombre_key;
SELECT _mt_try_unique_index(
  'uq_sig_sistemas_tenant_nombre',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_sig_sistemas_tenant_nombre ON sig_sistemas (tenant_id, nombre)'
);

DO $$ BEGIN ALTER TABLE sig_indicadores DROP CONSTRAINT IF EXISTS sig_indicadores_codigo_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS sig_indicadores_codigo_key;
SELECT _mt_try_unique_index(
  'uq_sig_indicadores_tenant_codigo',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_sig_indicadores_tenant_codigo ON sig_indicadores (tenant_id, codigo)'
);

DO $$ BEGIN ALTER TABLE accounting_entries DROP CONSTRAINT IF EXISTS accounting_entries_entry_number_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS accounting_entries_entry_number_key;
SELECT _mt_try_unique_index(
  'uq_accounting_entries_tenant_number',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_accounting_entries_tenant_number ON accounting_entries (tenant_id, entry_number)'
);

DO $$ BEGIN ALTER TABLE sst_checklist_items DROP CONSTRAINT IF EXISTS sst_checklist_items_codigo_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS sst_checklist_items_codigo_key;
SELECT _mt_try_unique_index(
  'uq_sst_checklist_items_tenant_codigo',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_sst_checklist_items_tenant_codigo ON sst_checklist_items (tenant_id, codigo)'
);

DROP FUNCTION IF EXISTS _mt_try_unique_index(TEXT, TEXT);
DROP FUNCTION IF EXISTS _mt_add_tenant_id(TEXT);

-- RLS
CREATE OR REPLACE FUNCTION _mt_enable_rls(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RAISE NOTICE 'skip RLS missing table: %', p_table;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table
      AND column_name = 'tenant_id'
  ) THEN
    RAISE NOTICE 'skip RLS no tenant_id: %', p_table;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', p_table);

  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_write ON %I', p_table);

  EXECUTE format(
    'CREATE POLICY tenant_isolation_select ON %I
       FOR SELECT
       USING (
         NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
         AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
       )',
    p_table
  );

  EXECUTE format(
    'CREATE POLICY tenant_isolation_write ON %I
       FOR ALL
       USING (
         NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
         AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
       )
       WITH CHECK (
         NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
         AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
       )',
    p_table
  );
END;
$$;

SELECT _mt_enable_rls('minuta_visitantes');
SELECT _mt_enable_rls('minuta_correspondencia');
SELECT _mt_enable_rls('minuta_contratistas');
SELECT _mt_enable_rls('minuta_domiciliarios');
SELECT _mt_enable_rls('minuta_incidentes');
SELECT _mt_enable_rls('minuta_servicio');
SELECT _mt_enable_rls('minuta_entrega_puesto');
SELECT _mt_enable_rls('inventory_warehouses');
SELECT _mt_enable_rls('inventory_stock');
SELECT _mt_enable_rls('puc_accounts');
SELECT _mt_enable_rls('accounting_entries');
SELECT _mt_enable_rls('accounting_entry_details');
SELECT _mt_enable_rls('sig_sistemas');
SELECT _mt_enable_rls('sig_objetivos');
SELECT _mt_enable_rls('sig_indicadores');
SELECT _mt_enable_rls('sig_resultados');
SELECT _mt_enable_rls('sst_clients');
SELECT _mt_enable_rls('sst_workplaces');
SELECT _mt_enable_rls('sst_checklist_items');
SELECT _mt_enable_rls('sst_inspections');
SELECT _mt_enable_rls('sst_responses');
SELECT _mt_enable_rls('sst_evidences');
SELECT _mt_enable_rls('payroll_periods');
SELECT _mt_enable_rls('payroll_slips');
SELECT _mt_enable_rls('payroll_slip_details');
SELECT _mt_enable_rls('vigia_turnos');
SELECT _mt_enable_rls('vigia_sos');
SELECT _mt_enable_rls('vigia_consignas');
SELECT _mt_enable_rls('vigia_minutas');
SELECT _mt_enable_rls('vigia_nomina');
SELECT _mt_enable_rls('vigia_nomina_reclamos');
SELECT _mt_enable_rls('vigia_dotacion_firmas');
SELECT _mt_enable_rls('vigia_pins');

DROP FUNCTION IF EXISTS _mt_enable_rls(TEXT);

COMMIT;
