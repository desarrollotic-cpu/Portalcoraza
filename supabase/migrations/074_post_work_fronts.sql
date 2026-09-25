-- 074: frentes de trabajo (servicios) por puesto — 1:N con posts.
-- No altera columnas existentes de posts.

BEGIN;

CREATE TABLE IF NOT EXISTS post_work_fronts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  front_number INT NOT NULL,
  hours INT NULL,
  detail TEXT NULL,
  notes TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_post_work_fronts_post_number UNIQUE (post_id, front_number),
  CONSTRAINT chk_post_work_fronts_number CHECK (front_number >= 1),
  CONSTRAINT chk_post_work_fronts_hours CHECK (hours IS NULL OR hours > 0)
);

CREATE INDEX IF NOT EXISTS idx_post_work_fronts_post
  ON post_work_fronts (post_id, front_number);

CREATE INDEX IF NOT EXISTS idx_post_work_fronts_tenant
  ON post_work_fronts (tenant_id);

COMMENT ON TABLE post_work_fronts IS
  'Servicios / frentes de trabajo por puesto (horas por frente; hours NULL = horario variable).';
COMMENT ON COLUMN post_work_fronts.hours IS
  'Horas del servicio (24, 12, 8…). NULL = horario variable.';

-- RLS tenant (mismo patrón que 041/042)
ALTER TABLE post_work_fronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_work_fronts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON post_work_fronts;
DROP POLICY IF EXISTS tenant_isolation_write ON post_work_fronts;

CREATE POLICY tenant_isolation_select ON post_work_fronts
  FOR SELECT
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation_write ON post_work_fronts
  FOR ALL
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON post_work_fronts TO coraza_app;

COMMIT;
