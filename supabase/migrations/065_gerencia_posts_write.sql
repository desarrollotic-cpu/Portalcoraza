-- 052 dejó posts.create solo en RECEPCIONISTA y Gerencia (admin maestro)
-- perdía el catálogo de puestos. El admin recupera create/edit; RRHH no.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code IN ('posts.create', 'posts.edit', 'posts.view')
ON CONFLICT DO NOTHING;

COMMIT;
