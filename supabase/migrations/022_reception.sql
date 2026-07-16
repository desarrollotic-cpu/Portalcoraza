-- Módulo Recepción: registro de visitantes (sede / control de acceso).
-- Historial permanente: no se borran filas; la salida cierra el registro.

BEGIN;

DO $$ BEGIN
  CREATE TYPE reception_sex AS ENUM ('M', 'F', 'OTRO', 'NO_DECLARA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reception_transport AS ENUM (
    'MOTO',
    'CARRO',
    'TRANSPORTE_PUBLICO',
    'OTRO',
    'NINGUNO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reception_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Datos personales (todos opcionales)
  document_number VARCHAR(40),
  first_surname VARCHAR(100),
  second_surname VARCHAR(100),
  first_name VARCHAR(100),
  second_name VARCHAR(100),
  sex reception_sex,
  birth_date DATE,
  arl VARCHAR(120),
  eps VARCHAR(120),
  origin_place VARCHAR(200),

  -- Ingreso
  visit_reason TEXT,
  entry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  authorized_by VARCHAR(200),
  registered_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Desplazamiento
  transport_means reception_transport,
  travel_time_minutes INTEGER CHECK (
    travel_time_minutes IS NULL OR travel_time_minutes >= 0
  ),

  -- Salida (historial: se conserva la fila)
  exit_at TIMESTAMPTZ,
  exit_notes TEXT,
  exited_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_reception_exit_after_entry CHECK (
    exit_at IS NULL OR exit_at >= entry_at
  )
);

CREATE INDEX IF NOT EXISTS idx_reception_visitors_entry
  ON reception_visitors (entry_at DESC);

CREATE INDEX IF NOT EXISTS idx_reception_visitors_inside
  ON reception_visitors (entry_at DESC)
  WHERE exit_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reception_visitors_document
  ON reception_visitors (document_number)
  WHERE document_number IS NOT NULL;

DROP TRIGGER IF EXISTS reception_visitors_updated_at ON reception_visitors;
CREATE TRIGGER reception_visitors_updated_at
  BEFORE UPDATE ON reception_visitors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Permisos
INSERT INTO permissions (code, name, module) VALUES
  ('reception.view', 'Ver panel de recepción', 'recepcion'),
  ('reception.register', 'Registrar visitantes en recepción', 'recepcion'),
  ('reception.exit', 'Registrar salida de visitantes', 'recepcion')
ON CONFLICT (code) DO NOTHING;

-- Gerencia: todos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'GERENCIA'
  AND p.code IN ('reception.view', 'reception.register', 'reception.exit')
ON CONFLICT DO NOTHING;

-- Rol operativo típico de recepción (si existe)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code IN ('ALMACENISTA', 'SUPERVISOR')
  AND p.code IN ('reception.view', 'reception.register', 'reception.exit')
ON CONFLICT DO NOTHING;

COMMIT;
