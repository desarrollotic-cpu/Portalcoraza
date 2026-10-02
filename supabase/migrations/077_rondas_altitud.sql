-- Altura GPS para distinguir terraza vs piso; radio por defecto más estrecho.

BEGIN;

ALTER TABLE rondas_puntos
  ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION;

ALTER TABLE rondas_marcaciones
  ADD COLUMN IF NOT EXISTS altitud DOUBLE PRECISION;

ALTER TABLE rondas_puntos
  ALTER COLUMN radio_metros SET DEFAULT 10;

COMMIT;
