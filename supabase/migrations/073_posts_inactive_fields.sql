-- 073_posts_inactive_fields.sql
-- Recepción: al dar de baja un puesto, la fecha de cierre no debe quedar
-- automática (updated_at). Se agregan campos para capturar la fecha real en
-- que terminó el contrato, el motivo y observaciones de la baja.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS inactive_date DATE NULL,
  ADD COLUMN IF NOT EXISTS inactive_reason VARCHAR(60) NULL,
  ADD COLUMN IF NOT EXISTS inactive_notes TEXT NULL;

COMMENT ON COLUMN posts.inactive_date IS
  'Fecha en que terminó el contrato / se dio de baja el puesto (capturada por Recepción al desactivar, no automática).';
COMMENT ON COLUMN posts.inactive_reason IS
  'Motivo de la baja: Terminación de contrato, No renovación, Decisión del cliente, Cierre del puesto, Otro.';
COMMENT ON COLUMN posts.inactive_notes IS
  'Observaciones libres capturadas al dar de baja el puesto.';
