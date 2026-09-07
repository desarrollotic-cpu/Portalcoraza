-- Observaciones de la programación mensual (una nota por puesto/mes, como en la planilla Excel).
ALTER TABLE monthly_schedules
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

COMMENT ON COLUMN monthly_schedules.observaciones IS 'Notas del puesto en ese mes (columna Observaciones de la planilla).';
