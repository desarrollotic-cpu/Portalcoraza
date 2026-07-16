-- Vincula puestos de Programación (posts) con centros de trabajo RRHH.
-- Un centro de trabajo operativo se refleja como puesto para turnos/vigilantes.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS work_center_id UUID REFERENCES work_centers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_work_center_id_uidx
  ON posts (work_center_id)
  WHERE work_center_id IS NOT NULL;

-- Enlazar puestos existentes que ya compartían código con un centro
UPDATE posts p
SET
  work_center_id = wc.id,
  name = COALESCE(NULLIF(TRIM(wc.client_name), ''), p.name),
  client_name = wc.client_name,
  address = COALESCE(wc.address, p.address),
  notes = COALESCE(wc.notes, p.notes),
  status = CASE WHEN wc.is_active THEN 'ACTIVO'::post_status ELSE 'INACTIVO'::post_status END,
  updated_at = NOW()
FROM work_centers wc
WHERE p.code = wc.code
  AND p.work_center_id IS NULL;

-- Crear puestos faltantes a partir de centros sin post vinculado ni código ocupado
INSERT INTO posts (code, name, type, status, address, client_name, notes, work_center_id)
SELECT
  wc.code,
  COALESCE(NULLIF(TRIM(wc.client_name), ''), wc.code),
  'SERVICIO_ESPECIAL'::post_type,
  CASE WHEN wc.is_active THEN 'ACTIVO'::post_status ELSE 'INACTIVO'::post_status END,
  wc.address,
  wc.client_name,
  wc.notes,
  wc.id
FROM work_centers wc
WHERE NOT EXISTS (
  SELECT 1 FROM posts p WHERE p.work_center_id = wc.id
)
AND NOT EXISTS (
  SELECT 1 FROM posts p WHERE p.code = wc.code
);
