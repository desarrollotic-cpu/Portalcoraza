-- Índices para purga diaria de historial (>30 días).

BEGIN;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_radio_control_checks_checked_at
  ON radio_control_checks (checked_at);

CREATE INDEX IF NOT EXISTS idx_radio_control_passes_closed_at
  ON radio_control_passes (closed_at)
  WHERE closed_at IS NOT NULL;

COMMIT;
