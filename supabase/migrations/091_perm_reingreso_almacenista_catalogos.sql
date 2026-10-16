-- Reingreso de asociados: el formulario carga cargos y centros de trabajo, así que el rol
-- ALMACENISTA necesita verlos (sin ello la pantalla de reingreso quedaba en blanco).
BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ALMACENISTA'
  AND p.code IN ('job_positions.view', 'work_centers.view')
ON CONFLICT DO NOTHING;

COMMIT;
