-- Especificaciones opcionales del catálogo de elementos de puesto.

BEGIN;

ALTER TABLE post_equipment_catalog
  ADD COLUMN IF NOT EXISTS brand VARCHAR(120),
  ADD COLUMN IF NOT EXISTS model VARCHAR(120),
  ADD COLUMN IF NOT EXISTS category VARCHAR(80),
  ADD COLUMN IF NOT EXISTS color VARCHAR(60),
  ADD COLUMN IF NOT EXISTS approximate_value NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS specs TEXT;

COMMIT;
