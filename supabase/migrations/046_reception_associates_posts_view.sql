-- RECEPCIONISTA: lectura de asociados (cartas laborales) y puestos de Operaciones
-- (dashboard de altas/bajas en Recepción). Sin create/edit.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'RECEPCIONISTA'
  AND p.code IN ('associates.view', 'posts.view')
ON CONFLICT DO NOTHING;

COMMIT;
