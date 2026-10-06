-- Orden de llamada radio (como Excel) + vínculo opcional a puestos.

BEGIN;

CREATE TABLE IF NOT EXISTS radio_control_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  sort_order INT NOT NULL,
  label VARCHAR(200) NOT NULL,
  callsign VARCHAR(40),
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT radio_control_roster_uniq UNIQUE (tenant_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_radio_control_roster_post
  ON radio_control_roster (tenant_id, post_id)
  WHERE post_id IS NOT NULL;

COMMIT;
