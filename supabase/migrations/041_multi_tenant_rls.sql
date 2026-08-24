-- 041_multi_tenant_rls.sql
-- Row Level Security por tenant_id. Tablas globales SIN RLS.
-- Rol coraza_app: sin BYPASSRLS (para que FORCE RLS aplique aunque el login sea superuser vía SET ROLE).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) App role (no superuser, no bypassrls)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coraza_app') THEN
    CREATE ROLE coraza_app NOINHERIT NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO coraza_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coraza_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO coraza_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO coraza_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO coraza_app;

-- Permitir a roles de login actuales adoptar coraza_app dentro de transacciones
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rolname FROM pg_roles
    WHERE rolcanlogin
      AND rolname NOT IN ('coraza_app', 'pg_signal_backend')
      AND rolname NOT LIKE 'pg_%'
  LOOP
    BEGIN
      EXECUTE format('GRANT coraza_app TO %I', r.rolname);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip GRANT coraza_app TO %: %', r.rolname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Helper: enable FORCE RLS + tenant policy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _mt_enable_rls(p_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_regclass(format('public.%I', p_table)) IS NULL THEN
    RAISE NOTICE 'skip RLS missing table: %', p_table;
    RETURN;
  END IF;

  -- Only if tenant_id column exists
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

-- ---------------------------------------------------------------------------
-- 3) Apply to business tables (NOT globals: roles, permissions, role_permissions,
--    diagnosticos_cie10, organizations)
-- ---------------------------------------------------------------------------
SELECT _mt_enable_rls('users');
SELECT _mt_enable_rls('refresh_tokens');
SELECT _mt_enable_rls('posts');
SELECT _mt_enable_rls('associates');
SELECT _mt_enable_rls('associate_history');
SELECT _mt_enable_rls('audit_logs');
SELECT _mt_enable_rls('notifications');
SELECT _mt_enable_rls('user_posts');
SELECT _mt_enable_rls('user_permissions');
SELECT _mt_enable_rls('inventory_categories');
SELECT _mt_enable_rls('inventory_items');
SELECT _mt_enable_rls('inventory_variants');
SELECT _mt_enable_rls('inventory_movements');
SELECT _mt_enable_rls('deliveries');
SELECT _mt_enable_rls('delivery_details');
SELECT _mt_enable_rls('shift_schedules');
SELECT _mt_enable_rls('monthly_schedules');
SELECT _mt_enable_rls('schedule_assignments');
SELECT _mt_enable_rls('schedule_templates');
SELECT _mt_enable_rls('document_types');
SELECT _mt_enable_rls('document_records');
SELECT _mt_enable_rls('job_positions');
SELECT _mt_enable_rls('work_centers');
SELECT _mt_enable_rls('catalog_values');
SELECT _mt_enable_rls('position_history');
SELECT _mt_enable_rls('associate_retirements');
SELECT _mt_enable_rls('associate_documents');
SELECT _mt_enable_rls('hr_alerts');
SELECT _mt_enable_rls('associate_absences');
SELECT _mt_enable_rls('post_equipment_catalog');
SELECT _mt_enable_rls('post_equipment_assignments');
SELECT _mt_enable_rls('post_equipment_units');
SELECT _mt_enable_rls('reception_visitors');
SELECT _mt_enable_rls('doc_counters');
SELECT _mt_enable_rls('doc_retention_table');
SELECT _mt_enable_rls('doc_correspondence');
SELECT _mt_enable_rls('doc_minutes');
SELECT _mt_enable_rls('doc_retired_personnel');
SELECT _mt_enable_rls('doc_contracts');
SELECT _mt_enable_rls('doc_workflows');
SELECT _mt_enable_rls('doc_loans');
SELECT _mt_enable_rls('doc_library_folders');
SELECT _mt_enable_rls('doc_library_files');
SELECT _mt_enable_rls('cp_visitors');
SELECT _mt_enable_rls('cp_packages');
SELECT _mt_enable_rls('cp_reservations');

DROP FUNCTION IF EXISTS _mt_enable_rls(TEXT);

COMMIT;
