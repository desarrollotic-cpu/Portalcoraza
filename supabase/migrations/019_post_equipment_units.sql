-- Unidades individuales de elementos de puesto.
-- Ejemplo: 10 hornos → 10 filas; cada una indica en qué puesto está.

BEGIN;

DO $$ BEGIN
  CREATE TYPE post_equipment_unit_status AS ENUM (
    'AVAILABLE',
    'ASSIGNED',
    'LOST',
    'WRITTEN_OFF'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS post_equipment_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  catalog_id UUID NOT NULL REFERENCES post_equipment_catalog(id) ON DELETE RESTRICT,
  unit_code VARCHAR(50) NOT NULL,
  label VARCHAR(200),
  serial_or_tag VARCHAR(100),
  status post_equipment_unit_status NOT NULL DEFAULT 'AVAILABLE',
  current_post_id UUID NULL REFERENCES posts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_post_equipment_unit_code UNIQUE (catalog_id, unit_code)
);

CREATE INDEX IF NOT EXISTS idx_post_equipment_units_catalog
  ON post_equipment_units (catalog_id, status);

CREATE INDEX IF NOT EXISTS idx_post_equipment_units_post
  ON post_equipment_units (current_post_id)
  WHERE current_post_id IS NOT NULL;

DROP TRIGGER IF EXISTS post_equipment_units_updated_at ON post_equipment_units;
CREATE TRIGGER post_equipment_units_updated_at
  BEFORE UPDATE ON post_equipment_units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE post_equipment_assignments
  ADD COLUMN IF NOT EXISTS unit_id UUID NULL REFERENCES post_equipment_units(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_post_equipment_assignments_unit
  ON post_equipment_assignments (unit_id)
  WHERE unit_id IS NOT NULL;

-- Una unidad solo puede tener una asignación activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_post_equipment_unit_active_assignment
  ON post_equipment_assignments (unit_id)
  WHERE unit_id IS NOT NULL AND status = 'ASSIGNED';

-- Almacenista también gestiona catálogo/unidades
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ALMACENISTA' AND p.code = 'post_equipment.manage'
ON CONFLICT DO NOTHING;

-- Tipos frecuentes solicitados
INSERT INTO post_equipment_catalog (code, name, description, requires_return) VALUES
  ('SOMBRILLA', 'Sombrilla', 'Sombrilla / parasol del puesto', TRUE),
  ('CARPA', 'Carpa', 'Carpa / toldo del puesto', TRUE),
  ('COMPUTADOR', 'Computador', 'Equipo de cómputo del puesto', TRUE)
ON CONFLICT (code) DO NOTHING;

COMMIT;
