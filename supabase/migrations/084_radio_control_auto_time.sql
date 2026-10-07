-- Hora automática al marcar (sin franjas fijas para todos).

BEGIN;

ALTER TABLE radio_control_checks
  DROP CONSTRAINT IF EXISTS radio_control_checks_uniq;

ALTER TABLE radio_control_checks
  ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;

UPDATE radio_control_checks
SET checked_at = (
  (check_date::text || ' ' || slot_time::text)::timestamp
  AT TIME ZONE 'America/Bogota'
)
WHERE checked_at IS NULL;

ALTER TABLE radio_control_checks
  ALTER COLUMN checked_at SET DEFAULT NOW();

ALTER TABLE radio_control_checks
  ALTER COLUMN checked_at SET NOT NULL;

-- slot_time pasa a ser la hora efectiva del marcado (puede repetirse).
ALTER TABLE radio_control_checks
  ALTER COLUMN slot_time DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_radio_control_checked_at
  ON radio_control_checks (tenant_id, check_date, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_radio_control_roster_latest
  ON radio_control_checks (tenant_id, roster_id, checked_at DESC);

COMMIT;
