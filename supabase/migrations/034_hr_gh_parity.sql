-- Paridad RRHH con Gestión Humana (origen).
-- Amplía celular recortado, agrega usuarios históricos de GH (sin contraseña)
-- y deja el esquema listo para valores de catálogo/cargo exactos.

BEGIN;

ALTER TABLE associates
  ALTER COLUMN mobile TYPE VARCHAR(80);

CREATE TABLE IF NOT EXISTS hr_legacy_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin_id TEXT NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  correo VARCHAR(200) NOT NULL UNIQUE,
  rol VARCHAR(80) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_legacy_users IS
  'Usuarios de la app GH antigua. No son logins del Portal (users). Sin hash de clave.';

COMMIT;
