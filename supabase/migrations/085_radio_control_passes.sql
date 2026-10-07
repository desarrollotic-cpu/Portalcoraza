-- Pasadas de control de radio (tablas completas) + historial.

BEGIN;

CREATE TABLE IF NOT EXISTS radio_control_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pass_date DATE NOT NULL,
  pass_number INT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT radio_control_passes_uniq UNIQUE (tenant_id, pass_date, pass_number)
);

CREATE INDEX IF NOT EXISTS idx_radio_control_passes_date
  ON radio_control_passes (tenant_id, pass_date, pass_number DESC);

ALTER TABLE radio_control_checks
  ADD COLUMN IF NOT EXISTS pass_id UUID REFERENCES radio_control_passes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_radio_control_checks_pass
  ON radio_control_checks (tenant_id, pass_id);

-- Backfill: una pasada cerrada por día con los checks existentes sin pass_id.
INSERT INTO radio_control_passes (tenant_id, pass_date, pass_number, opened_at, closed_at)
SELECT c.tenant_id,
       c.check_date,
       1,
       MIN(c.checked_at),
       MAX(c.checked_at)
FROM radio_control_checks c
WHERE c.pass_id IS NULL
GROUP BY c.tenant_id, c.check_date
ON CONFLICT (tenant_id, pass_date, pass_number) DO NOTHING;

UPDATE radio_control_checks c
SET pass_id = p.id
FROM radio_control_passes p
WHERE c.pass_id IS NULL
  AND p.tenant_id = c.tenant_id
  AND p.pass_date = c.check_date
  AND p.pass_number = 1;

COMMIT;
