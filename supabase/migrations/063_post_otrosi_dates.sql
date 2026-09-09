-- Otro sí: mismas fechas que contrato (inicial, tiempo, final).
ALTER TABLE post_otrosi
  ADD COLUMN IF NOT EXISTS term VARCHAR(80),
  ADD COLUMN IF NOT EXISTS date_end VARCHAR(80);

COMMENT ON COLUMN post_otrosi.date_text IS 'Fecha inicial del otro sí.';
COMMENT ON COLUMN post_otrosi.term IS 'Tiempo del otro sí.';
COMMENT ON COLUMN post_otrosi.date_end IS 'Fecha final del otro sí.';
