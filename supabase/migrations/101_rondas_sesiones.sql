-- Sesiones de ronda: a qué hora empezó y a qué hora terminó cada recorrido.
--
-- Hasta ahora "Iniciar ronda" y "Terminar ronda" solo vivían en el teléfono, y
-- del servidor solo se sabía la hora de cada marca. Las administraciones piden
-- el detalle completo: a qué hora inició, por qué puntos pasó y a qué hora, y a
-- qué hora terminó. Eso exige guardar el inicio y el fin.
--
-- `uuid_cliente` lo genera el teléfono: la ronda puede empezar sin señal, así
-- que la sesión viaja con la cola de envío y se inserta cuando haya datos. Al
-- ser única, reenviar el mismo lote no duplica nada.

BEGIN;

CREATE TABLE IF NOT EXISTS rondas_sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  uuid_cliente UUID NOT NULL UNIQUE,
  ruta_id UUID NOT NULL REFERENCES rondas_rutas(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id),
  inicio TIMESTAMPTZ NOT NULL,
  -- NULL mientras la ronda siga abierta.
  fin TIMESTAMPTZ,
  dispositivo_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rondas_sesiones_fin CHECK (fin IS NULL OR fin >= inicio)
);

CREATE INDEX IF NOT EXISTS idx_rondas_sesiones_ruta
  ON rondas_sesiones (ruta_id, inicio DESC);

CREATE INDEX IF NOT EXISTS idx_rondas_sesiones_fecha
  ON rondas_sesiones (tenant_id, inicio DESC);

DROP TRIGGER IF EXISTS rondas_sesiones_updated_at ON rondas_sesiones;
CREATE TRIGGER rondas_sesiones_updated_at
  BEFORE UPDATE ON rondas_sesiones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE rondas_sesiones IS
  'Un recorrido: desde que el vigilante pulsa Iniciar ronda hasta que pulsa Terminar. Las marcas del recorrido apuntan aquí.';

-- La marca queda ligada a su recorrido. Nullable: las marcas anteriores a esta
-- migración no tienen sesión, y una marca puede llegar sin ella si el teléfono
-- perdió el dato.
ALTER TABLE rondas_marcaciones
  ADD COLUMN IF NOT EXISTS sesion_id UUID REFERENCES rondas_sesiones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rondas_marc_sesion
  ON rondas_marcaciones (sesion_id, fecha_hora);

-- Aislamiento por tenant, igual que el resto de las tablas de negocio. La
-- política va escrita a mano porque el helper `_mt_enable_rls` de la 041 se
-- borra al final de esa misma migración.
ALTER TABLE rondas_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_sesiones FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON rondas_sesiones;
DROP POLICY IF EXISTS tenant_isolation_write ON rondas_sesiones;

CREATE POLICY tenant_isolation_select ON rondas_sesiones
  FOR SELECT
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation_write ON rondas_sesiones
  FOR ALL
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

REVOKE ALL ON TABLE public.rondas_sesiones FROM anon;
REVOKE ALL ON TABLE public.rondas_sesiones FROM authenticated;

COMMIT;
