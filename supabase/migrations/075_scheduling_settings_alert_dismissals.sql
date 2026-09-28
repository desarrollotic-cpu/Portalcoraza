-- 075: Programación — reglas por tenant (mínimo/máximo/descanso) y alertas descartadas con motivo.
-- No altera tablas existentes. Sin fila en scheduling_settings = valores por defecto del código
-- (DEFAULT_SCHEDULING_RULES en apps/api/src/modules/scheduling/monthly-alerts.compute.ts).

BEGIN;

CREATE TABLE IF NOT EXISTS scheduling_settings (
  tenant_id UUID PRIMARY KEY DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  min_horas_mes INT NOT NULL DEFAULT 210,
  max_horas_mes INT NOT NULL DEFAULT 288,
  descanso_min_horas INT NOT NULL DEFAULT 8,
  novedades_reducen_minimo BOOLEAN NOT NULL DEFAULT TRUE,
  dias_sin_turno_alerta INT NOT NULL DEFAULT 15,
  updated_by UUID NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sched_settings_min CHECK (min_horas_mes BETWEEN 0 AND 400),
  CONSTRAINT chk_sched_settings_max CHECK (max_horas_mes BETWEEN 1 AND 744),
  CONSTRAINT chk_sched_settings_min_max CHECK (min_horas_mes <= max_horas_mes),
  CONSTRAINT chk_sched_settings_descanso CHECK (descanso_min_horas BETWEEN 0 AND 48),
  CONSTRAINT chk_sched_settings_sin_turno CHECK (dias_sin_turno_alerta BETWEEN 1 AND 90)
);

COMMENT ON TABLE scheduling_settings IS
  'Reglas del cuadro de turnos por tenant: horas mínimas/máximas al mes, descanso entre turnos.';

CREATE TABLE IF NOT EXISTS schedule_alert_dismissals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  alert_id TEXT NOT NULL,
  motivo TEXT NOT NULL,
  dismissed_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_schedule_alert_dismissals UNIQUE (tenant_id, alert_id),
  CONSTRAINT chk_schedule_alert_dismissals_motivo CHECK (char_length(btrim(motivo)) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_schedule_alert_dismissals_tenant
  ON schedule_alert_dismissals (tenant_id);

COMMENT ON TABLE schedule_alert_dismissals IS
  'Alertas de Control de Alertas descartadas (revisadas) con motivo; alert_id = id estable de computeMonthlyAlerts.';

-- RLS tenant (mismo patrón que 041/042/074)
ALTER TABLE scheduling_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule_alert_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_alert_dismissals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_select ON scheduling_settings;
DROP POLICY IF EXISTS tenant_isolation_write ON scheduling_settings;
DROP POLICY IF EXISTS tenant_isolation_select ON schedule_alert_dismissals;
DROP POLICY IF EXISTS tenant_isolation_write ON schedule_alert_dismissals;

CREATE POLICY tenant_isolation_select ON scheduling_settings
  FOR SELECT
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation_write ON scheduling_settings
  FOR ALL
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation_select ON schedule_alert_dismissals
  FOR SELECT
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

CREATE POLICY tenant_isolation_write ON schedule_alert_dismissals
  FOR ALL
  USING (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON scheduling_settings TO coraza_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_alert_dismissals TO coraza_app;

COMMIT;
