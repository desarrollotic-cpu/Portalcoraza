-- PIN de acceso Vigía (hash bcrypt, 4 dígitos del usuario).

BEGIN;

CREATE TABLE IF NOT EXISTS vigia_pins (
  associate_id UUID PRIMARY KEY REFERENCES associates(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
