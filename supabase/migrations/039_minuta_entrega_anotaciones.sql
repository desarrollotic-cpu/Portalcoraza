-- Entrega y recibida de puesto: campo de anotaciones.

ALTER TABLE minuta_entrega_puesto
  ADD COLUMN IF NOT EXISTS anotaciones TEXT;
