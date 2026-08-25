-- Coraza Vigía — turnos, SOS, consignas, minutas, nómina vigilante.

BEGIN;

CREATE TABLE IF NOT EXISTS vigia_turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  relevo_nombre TEXT,
  relevo_foto_base64 TEXT,
  estado TEXT NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'CERRADO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vigia_turnos_associate ON vigia_turnos(associate_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigia_turnos_post ON vigia_turnos(post_id, started_at DESC);

CREATE TABLE IF NOT EXISTS vigia_sos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES vigia_turnos(id) ON DELETE SET NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  motivo TEXT NOT NULL DEFAULT 'Pánico manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vigia_sos_created ON vigia_sos(created_at DESC);

CREATE TABLE IF NOT EXISTS vigia_consignas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('CONTACTS', 'RULES')),
  titulo TEXT NOT NULL,
  detalle TEXT,
  telefono TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vigia_consignas_post ON vigia_consignas(post_id, tipo);

CREATE TABLE IF NOT EXISTS vigia_minutas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  nombre_puesto TEXT,
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  turno_id UUID REFERENCES vigia_turnos(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  entrada_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  salida_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vigia_minutas_post ON vigia_minutas(post_id, entrada_at DESC);

CREATE TABLE IF NOT EXISTS vigia_nomina (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  horas_ordinarias NUMERIC(10,2) DEFAULT 0,
  horas_extra NUMERIC(10,2) DEFAULT 0,
  recargo_nocturno NUMERIC(10,2) DEFAULT 0,
  recargo_festivo NUMERIC(10,2) DEFAULT 0,
  neto NUMERIC(12,2) DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vigia_nomina_associate ON vigia_nomina(associate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vigia_nomina_reclamos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  detalle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vigia_dotacion_firmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  items TEXT NOT NULL,
  firma_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS vigia_turnos_updated_at ON vigia_turnos;
CREATE TRIGGER vigia_turnos_updated_at
  BEFORE UPDATE ON vigia_turnos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO permissions (code, name, module) VALUES
  ('vigia.view', 'Ver módulo Coraza Vigía (Portal)', 'vigia'),
  ('vigia.manage', 'Gestionar consignas, SOS y colillas Vigía', 'vigia')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code IN ('vigia.view', 'vigia.manage')
ON CONFLICT DO NOTHING;

COMMIT;
