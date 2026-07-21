-- Gerencia (admin maestro): acceso a TODOS los permisos existentes.
-- Incluye usuarios/roles y todo lo que puedan hacer RRHH, Dotación, etc.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'GERENCIA'
ON CONFLICT DO NOTHING;

COMMIT;
