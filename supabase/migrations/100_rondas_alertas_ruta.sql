-- Las alertas de ronda también cuelgan de la ronda, no de una persona.
--
-- Va aparte de la 099 porque esa ya está aplicada. Mismo motivo que allí:
-- Rondas no identifica al vigilante, así que `associate_id` deja de ser
-- obligatorio y la alerta queda ligada a la ronda que la envió.

BEGIN;

ALTER TABLE rondas_alertas
  ADD COLUMN IF NOT EXISTS ruta_id UUID REFERENCES rondas_rutas(id);

CREATE INDEX IF NOT EXISTS idx_rondas_alertas_ruta
  ON rondas_alertas (ruta_id, fecha_hora DESC);

ALTER TABLE rondas_alertas
  ALTER COLUMN associate_id DROP NOT NULL;

COMMENT ON COLUMN rondas_alertas.associate_id IS
  'OBSOLETA: Rondas ya no identifica al vigilante. Se conserva lo histórico.';

COMMIT;
