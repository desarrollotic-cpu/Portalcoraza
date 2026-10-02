CREATE TABLE IF NOT EXISTS rondas_puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  nombre VARCHAR(120) NOT NULL,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  altitud DOUBLE PRECISION,
  radio_metros INTEGER NOT NULL DEFAULT 10,
  orden INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rondas_puntos_post ON rondas_puntos(tenant_id, post_id, activo);

CREATE TABLE IF NOT EXISTS rondas_marcaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  uuid_cliente UUID NOT NULL,
  punto_id UUID NOT NULL REFERENCES rondas_puntos(id),
  associate_id UUID NOT NULL REFERENCES associates(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  precision_metros REAL,
  distancia_al_punto REAL NOT NULL,
  altitud DOUBLE PRECISION,
  fecha_hora TIMESTAMPTZ NOT NULL,
  dispositivo_id VARCHAR(100),
  es_mock BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (uuid_cliente)
);
CREATE INDEX IF NOT EXISTS idx_rondas_marc_fecha ON rondas_marcaciones(tenant_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_rondas_marc_vig ON rondas_marcaciones(associate_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_rondas_marc_punto ON rondas_marcaciones(punto_id, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_rondas_marc_post ON rondas_marcaciones(post_id, fecha_hora DESC);

CREATE OR REPLACE FUNCTION rondas_bloquear_marcaciones() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Las marcaciones de ronda no se pueden modificar ni eliminar';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rondas_marc_inmutable ON rondas_marcaciones;
CREATE TRIGGER trg_rondas_marc_inmutable
BEFORE UPDATE OR DELETE ON rondas_marcaciones
FOR EACH ROW EXECUTE FUNCTION rondas_bloquear_marcaciones();

INSERT INTO permissions (code, name, module) VALUES
  ('rondas.view', 'Ver cumplimiento de rondas GPS', 'rondas'),
  ('rondas.setup', 'Crear y ajustar puntos de ronda', 'rondas'),
  ('rondas.marcar', 'Marcar puntos de ronda en campo', 'rondas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code IN ('rondas.view', 'rondas.setup')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions ops ON ops.id = rp.permission_id AND ops.code = 'operations.view'
JOIN permissions p ON p.code IN ('rondas.view', 'rondas.setup')
ON CONFLICT DO NOTHING;

ALTER TABLE rondas_puntos ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION;
ALTER TABLE rondas_marcaciones ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION;

