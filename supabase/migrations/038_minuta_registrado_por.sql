-- Minuta Virtual: vigilante que registra (cuenta de puesto compartida).

ALTER TABLE minuta_visitantes
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;

ALTER TABLE minuta_correspondencia
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;

ALTER TABLE minuta_contratistas
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;

ALTER TABLE minuta_domiciliarios
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;

ALTER TABLE minuta_incidentes
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;

ALTER TABLE minuta_servicio
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;

ALTER TABLE minuta_entrega_puesto
  ADD COLUMN IF NOT EXISTS registrado_por TEXT;
