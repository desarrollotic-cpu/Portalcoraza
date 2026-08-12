-- Robustez PIN Vigía: intentos fallidos y bloqueo temporal.

BEGIN;

CREATE TABLE IF NOT EXISTS vigia_pins (
  associate_id UUID PRIMARY KEY REFERENCES associates(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vigia_pins
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE vigia_pins
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

COMMIT;
