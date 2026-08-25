-- 040_multi_tenant_foundation.sql
-- Multi-tenant foundation (opción A): organizations + tenant_id + cp_* + copropiedades
-- SAFE: ADD nullable → backfill Cooperativa Central → NOT NULL → FK → indexes
-- Idempotent where possible (IF NOT EXISTS / DO blocks)

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Constant: Cooperativa Central
-- ---------------------------------------------------------------------------
-- 11111111-1111-1111-1111-111111111111

-- ---------------------------------------------------------------------------
-- 1) organizations (tenant root)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  nit VARCHAR(50),
  direccion TEXT,
  telefono VARCHAR(50),
  email VARCHAR(150),
  plan VARCHAR(50) NOT NULL DEFAULT 'basico',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_nit
  ON organizations (nit)
  WHERE nit IS NOT NULL;

INSERT INTO organizations (id, nombre, nit, plan, activo, config)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Cooperativa Central',
  '900000000-0',
  'interno',
  TRUE,
  '{"kind":"cooperative"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Helper: add tenant_id + backfill + NOT NULL + FK + index
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 3) Apply to business tables (skip globals: roles, permissions, role_permissions, diagnosticos_cie10)
-- ---------------------------------------------------------------------------
SELECT _mt_add_tenant_id('users');
SELECT _mt_add_tenant_id('refresh_tokens');
SELECT _mt_add_tenant_id('posts');
SELECT _mt_add_tenant_id('associates');
SELECT _mt_add_tenant_id('associate_history');
SELECT _mt_add_tenant_id('audit_logs');
SELECT _mt_add_tenant_id('notifications');
SELECT _mt_add_tenant_id('user_posts');
SELECT _mt_add_tenant_id('user_permissions');

SELECT _mt_add_tenant_id('inventory_categories');
SELECT _mt_add_tenant_id('inventory_items');
SELECT _mt_add_tenant_id('inventory_variants');
SELECT _mt_add_tenant_id('inventory_movements');
SELECT _mt_add_tenant_id('deliveries');
SELECT _mt_add_tenant_id('delivery_details');

SELECT _mt_add_tenant_id('shift_schedules');
SELECT _mt_add_tenant_id('monthly_schedules');
SELECT _mt_add_tenant_id('schedule_assignments');
SELECT _mt_add_tenant_id('schedule_templates');

SELECT _mt_add_tenant_id('document_types');
SELECT _mt_add_tenant_id('document_records');

SELECT _mt_add_tenant_id('job_positions');
SELECT _mt_add_tenant_id('work_centers');
SELECT _mt_add_tenant_id('catalog_values');
SELECT _mt_add_tenant_id('position_history');
SELECT _mt_add_tenant_id('associate_retirements');
SELECT _mt_add_tenant_id('associate_documents');
SELECT _mt_add_tenant_id('hr_alerts');
SELECT _mt_add_tenant_id('associate_absences');

SELECT _mt_add_tenant_id('post_equipment_catalog');
SELECT _mt_add_tenant_id('post_equipment_assignments');
SELECT _mt_add_tenant_id('post_equipment_units');

SELECT _mt_add_tenant_id('reception_visitors');

SELECT _mt_add_tenant_id('doc_counters');
SELECT _mt_add_tenant_id('doc_retention_table');
SELECT _mt_add_tenant_id('doc_correspondence');
SELECT _mt_add_tenant_id('doc_minutes');
SELECT _mt_add_tenant_id('doc_retired_personnel');
SELECT _mt_add_tenant_id('doc_contracts');
SELECT _mt_add_tenant_id('doc_workflows');
SELECT _mt_add_tenant_id('doc_loans');
SELECT _mt_add_tenant_id('doc_library_folders');
SELECT _mt_add_tenant_id('doc_library_files');

-- ---------------------------------------------------------------------------
-- 4) Composite unique indexes (best-effort; skip if duplicate data exists)
-- ---------------------------------------------------------------------------
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

DO $$ BEGIN ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS users_email_key;
SELECT _mt_try_unique_index(
  'uq_users_tenant_email',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email ON users (tenant_id, email)'
);

DO $$ BEGIN ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS posts_code_key;
SELECT _mt_try_unique_index(
  'uq_posts_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_tenant_code ON posts (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE work_centers DROP CONSTRAINT IF EXISTS work_centers_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS work_centers_code_key;
SELECT _mt_try_unique_index(
  'uq_work_centers_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_work_centers_tenant_code ON work_centers (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE job_positions DROP CONSTRAINT IF EXISTS job_positions_name_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS job_positions_name_key;
SELECT _mt_try_unique_index(
  'uq_job_positions_tenant_name',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_job_positions_tenant_name ON job_positions (tenant_id, name)'
);

DO $$ BEGIN ALTER TABLE catalog_values DROP CONSTRAINT IF EXISTS catalog_values_kind_value_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS catalog_values_kind_value_key;
SELECT _mt_try_unique_index(
  'uq_catalog_values_tenant_kind_value',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_catalog_values_tenant_kind_value ON catalog_values (tenant_id, kind, value)'
);

DO $$ BEGIN ALTER TABLE inventory_categories DROP CONSTRAINT IF EXISTS inventory_categories_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS inventory_categories_code_key;
SELECT _mt_try_unique_index(
  'uq_inventory_categories_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_categories_tenant_code ON inventory_categories (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS inventory_items_code_key;
SELECT _mt_try_unique_index(
  'uq_inventory_items_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_tenant_code ON inventory_items (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE inventory_variants DROP CONSTRAINT IF EXISTS inventory_variants_sku_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS inventory_variants_sku_key;
SELECT _mt_try_unique_index(
  'uq_inventory_variants_tenant_sku',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_variants_tenant_sku ON inventory_variants (tenant_id, sku)'
);

DO $$ BEGIN ALTER TABLE post_equipment_catalog DROP CONSTRAINT IF EXISTS post_equipment_catalog_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS post_equipment_catalog_code_key;
SELECT _mt_try_unique_index(
  'uq_post_equipment_catalog_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_post_equipment_catalog_tenant_code ON post_equipment_catalog (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE document_types DROP CONSTRAINT IF EXISTS document_types_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS document_types_code_key;
SELECT _mt_try_unique_index(
  'uq_document_types_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_document_types_tenant_code ON document_types (tenant_id, code)'
);

DO $$ BEGIN ALTER TABLE document_records DROP CONSTRAINT IF EXISTS document_records_code_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS document_records_code_key;
SELECT _mt_try_unique_index(
  'uq_document_records_tenant_code',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_document_records_tenant_code ON document_records (tenant_id, code)'
);

DROP INDEX IF EXISTS uidx_associates_document;
SELECT _mt_try_unique_index(
  'uidx_associates_tenant_document',
  'CREATE UNIQUE INDEX IF NOT EXISTS uidx_associates_tenant_document ON associates (tenant_id, document_number) WHERE document_number IS NOT NULL'
);

DO $$ BEGIN ALTER TABLE doc_retired_personnel DROP CONSTRAINT IF EXISTS doc_retired_personnel_id_number_key; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP INDEX IF EXISTS doc_retired_personnel_id_number_key;
DROP INDEX IF EXISTS uq_doc_retired_personnel_tenant_id_number;
CREATE INDEX IF NOT EXISTS idx_doc_retired_personnel_tenant_id_number
  ON doc_retired_personnel (tenant_id, id_number);

DROP FUNCTION IF EXISTS _mt_try_unique_index(TEXT, TEXT);

-- ---------------------------------------------------------------------------
-- 5) Future business: copropiedades (inside an organization)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copropiedades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  nombre VARCHAR(200) NOT NULL,
  nit VARCHAR(50),
  direccion TEXT,
  telefono VARCHAR(50),
  email VARCHAR(150),
  plan VARCHAR(50) NOT NULL DEFAULT 'basico',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copropiedades_organization
  ON copropiedades (organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_copropiedades_org_nit
  ON copropiedades (organization_id, nit)
  WHERE nit IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6) Future module shells only (no business logic) — prefix cp_
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cp_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  nombre VARCHAR(200) NOT NULL,
  documento VARCHAR(50) NOT NULL,
  residente_nombre VARCHAR(200),
  unidad VARCHAR(80),
  entrada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  salida_at TIMESTAMPTZ,
  motivo TEXT,
  codigo_qr VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_visitors_tenant ON cp_visitors (tenant_id);

CREATE TABLE IF NOT EXISTS cp_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  descripcion TEXT NOT NULL,
  proveedor VARCHAR(150),
  destinatario VARCHAR(200),
  unidad VARCHAR(80),
  recibido_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregado_at TIMESTAMPTZ,
  foto_url TEXT,
  firma_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_packages_tenant ON cp_packages (tenant_id);

CREATE TABLE IF NOT EXISTS cp_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  residente_nombre VARCHAR(200) NOT NULL,
  recurso VARCHAR(80) NOT NULL,
  inicio_at TIMESTAMPTZ NOT NULL,
  fin_at TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_reservations_tenant ON cp_reservations (tenant_id);

-- ---------------------------------------------------------------------------
-- 7) Cleanup helper
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS _mt_add_tenant_id(TEXT);

COMMIT;
