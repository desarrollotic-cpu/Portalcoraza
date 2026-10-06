-- Control de radio independiente de posts: checks por fila del roster.

BEGIN;

-- Roster sin exigir vínculo a puestos (queda opcional para después).
ALTER TABLE radio_control_roster
  ALTER COLUMN post_id DROP NOT NULL;

-- Rehacer checks sobre roster_id (módulo nuevo; no conservar filas por post).
DROP TABLE IF EXISTS radio_control_checks;

CREATE TABLE radio_control_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  roster_id UUID NOT NULL REFERENCES radio_control_roster(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status VARCHAR(8) NOT NULL,
  notes TEXT,
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT radio_control_checks_status_chk
    CHECK (status IN ('S/N', 'N/C', 'N/A', 'C/N')),
  CONSTRAINT radio_control_checks_uniq
    UNIQUE (tenant_id, roster_id, check_date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_radio_control_date
  ON radio_control_checks (tenant_id, check_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_radio_control_roster
  ON radio_control_checks (tenant_id, roster_id, check_date);

-- Quitar vínculos automáticos; el enlace a posts es trabajo futuro.
UPDATE radio_control_roster SET post_id = NULL;

COMMIT;
