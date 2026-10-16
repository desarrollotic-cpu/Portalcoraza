-- Editar asociado carga los catálogos (EPS, fondo, etc.); el rol ALMACENISTA necesita verlos
-- (sin ello el formulario de edición salía vacío).
BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ALMACENISTA'
  AND p.code = 'catalogs.view'
ON CONFLICT DO NOTHING;

COMMIT;
