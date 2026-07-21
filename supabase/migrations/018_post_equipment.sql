-- Elementos entregados a puestos (fuera de inventario/almacén).
-- Objetivo: saber qué se entregó al iniciar un puesto y qué debe devolverse al cerrarlo.

BEGIN;

DO $$ BEGIN
  CREATE TYPE post_equipment_status AS ENUM (
    'ASSIGNED',
    'RETURNED',
    'LOST',
    'WRITTEN_OFF'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS post_equipment_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  requires_return BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_equipment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  catalog_id UUID NULL REFERENCES post_equipment_catalog(id) ON DELETE SET NULL,
  custom_name VARCHAR(200),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  serial_or_tag VARCHAR(100),
  condition_on_delivery VARCHAR(40),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  status post_equipment_status NOT NULL DEFAULT 'ASSIGNED',
  returned_at TIMESTAMPTZ,
  returned_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  return_condition VARCHAR(40),
  return_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_post_equipment_name CHECK (
    catalog_id IS NOT NULL OR (custom_name IS NOT NULL AND length(trim(custom_name)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_post_equipment_assignments_post
  ON post_equipment_assignments (post_id, status);

CREATE INDEX IF NOT EXISTS idx_post_equipment_assignments_delivered
  ON post_equipment_assignments (delivered_at DESC);

DROP TRIGGER IF EXISTS post_equipment_catalog_updated_at ON post_equipment_catalog;
CREATE TRIGGER post_equipment_catalog_updated_at
  BEFORE UPDATE ON post_equipment_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS post_equipment_assignments_updated_at ON post_equipment_assignments;
CREATE TRIGGER post_equipment_assignments_updated_at
  BEFORE UPDATE ON post_equipment_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Permisos
INSERT INTO permissions (code, name, module) VALUES
  ('post_equipment.view', 'Ver elementos de puesto', 'dotacion'),
  ('post_equipment.assign', 'Asignar elementos a puesto', 'dotacion'),
  ('post_equipment.return', 'Registrar devolución de elementos de puesto', 'dotacion'),
  ('post_equipment.manage', 'Gestionar catálogo de elementos de puesto', 'dotacion')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'GERENCIA' AND p.code IN (
  'post_equipment.view', 'post_equipment.assign', 'post_equipment.return', 'post_equipment.manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ALMACENISTA' AND p.code IN (
  'post_equipment.view', 'post_equipment.assign', 'post_equipment.return'
)
ON CONFLICT DO NOTHING;

-- Catálogo inicial (elementos típicos fuera de almacén)
INSERT INTO post_equipment_catalog (code, name, description, requires_return) VALUES
  ('MICROONDAS', 'Horno microondas', 'Electrodoméstico de cocina para el puesto', TRUE),
  ('NEVERA', 'Nevera / refrigerador', 'Refrigeración del puesto', TRUE),
  ('CAFETERA', 'Cafetera', 'Cafetera del puesto', TRUE),
  ('TV', 'Televisor', 'TV / monitor del puesto', TRUE),
  ('ESCRITORIO', 'Escritorio / mesa', 'Mobiliario', TRUE),
  ('SILLA', 'Silla', 'Mobiliario', TRUE),
  ('EXTINTOR', 'Extintor', 'Equipo de seguridad', TRUE),
  ('RADIO', 'Radio / comunicador', 'Equipo de comunicación', TRUE),
  ('OTRO', 'Otro elemento', 'Descripción libre al asignar', TRUE)
ON CONFLICT (code) DO NOTHING;

COMMIT;
