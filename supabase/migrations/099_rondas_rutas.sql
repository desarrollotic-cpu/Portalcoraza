-- Rondas con nombre, clave propia y sus puntos.
--
-- Antes los puntos colgaban directamente del puesto de trabajo y el vigilante
-- entraba eligiendo su nombre y escribiendo su cedula. Eso cambia:
--
--   * Rondas no necesita saber que vigilante la hizo. El reporte dice si el
--     puesto cumplio o no; el coordinador pregunta por la persona si le hace
--     falta. Por eso `associate_id` deja de ser obligatorio.
--   * La identidad pasa a ser de la ronda, no de la persona: se entra con el
--     nombre de la ronda y una clave. Un celular por puesto.
--   * Un puesto puede tener mas de una ronda (diurna y nocturna con puntos
--     distintos), que antes no se podia.

BEGIN;

CREATE TABLE IF NOT EXISTS rondas_rutas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  -- Nombre con el que se entra desde el celular, ej. "Ronda Coraza".
  nombre VARCHAR(120) NOT NULL,
  -- bcrypt, nunca la clave en texto. Se compara en el API.
  clave_hash TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Se entra por nombre, asi que no puede repetirse dentro del mismo tenant.
  CONSTRAINT uq_rondas_rutas_nombre UNIQUE (tenant_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_rondas_rutas_post
  ON rondas_rutas (tenant_id, post_id, activo);

DROP TRIGGER IF EXISTS rondas_rutas_updated_at ON rondas_rutas;
CREATE TRIGGER rondas_rutas_updated_at
  BEFORE UPDATE ON rondas_rutas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE rondas_rutas IS
  'Ronda con nombre y clave propias, amarrada a un puesto. Los puntos cuelgan de aqui.';

-- Los puntos pasan a colgar de la ronda. Nullable para no romper los que ya
-- existan; abajo se les crea su ronda y se enlazan.
ALTER TABLE rondas_puntos
  ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rondas_rutas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rondas_puntos_ruta
  ON rondas_puntos (ruta_id, orden);

-- Los puntos que ya estaban sueltos en un puesto se agrupan en una ronda por
-- puesto, para no perderlos. La clave queda imposible de usar a proposito: hay
-- que ponerle una desde el portal antes de que alguien pueda entrar.
INSERT INTO rondas_rutas (tenant_id, post_id, nombre, clave_hash)
SELECT DISTINCT
  p.tenant_id,
  p.post_id,
  'Ronda ' || COALESCE(NULLIF(BTRIM(po.name), ''), LEFT(p.post_id::text, 8)),
  '!sin-clave'
FROM rondas_puntos p
JOIN posts po ON po.id = p.post_id
WHERE p.ruta_id IS NULL
ON CONFLICT (tenant_id, nombre) DO NOTHING;

UPDATE rondas_puntos p
SET ruta_id = r.id
FROM rondas_rutas r
WHERE p.ruta_id IS NULL
  AND r.post_id = p.post_id
  AND r.tenant_id = p.tenant_id;

-- Rondas no guarda quien hizo la marca: el vigilante ya no se identifica.
ALTER TABLE rondas_marcaciones
  ALTER COLUMN associate_id DROP NOT NULL;

ALTER TABLE rondas_marcaciones
  ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rondas_rutas(id);

CREATE INDEX IF NOT EXISTS idx_rondas_marc_ruta
  ON rondas_marcaciones (ruta_id, fecha_hora DESC);

COMMENT ON COLUMN rondas_marcaciones.associate_id IS
  'OBSOLETA: Rondas ya no identifica al vigilante. Se conserva lo historico.';

-- Aislamiento por tenant, igual que el resto de las tablas de negocio. La
-- politica va escrita a mano porque el helper `_mt_enable_rls` de la 041 se
-- borra al final de esa misma migracion.
ALTER TABLE rondas_rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_rutas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON rondas_rutas;
DROP POLICY IF EXISTS tenant_isolation_write ON rondas_rutas;

CREATE POLICY tenant_isolation_select ON rondas_rutas
  FOR SELECT
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation_write ON rondas_rutas
  FOR ALL
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

REVOKE ALL ON TABLE public.rondas_rutas FROM anon;
REVOKE ALL ON TABLE public.rondas_rutas FROM authenticated;

COMMIT;
