-- RECEPCIONISTA: crear/editar puestos de Operaciones (piloto).
-- Ya tenía posts.view (migración 046). Ahora también puede administrar.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'RECEPCIONISTA'
  AND p.code IN ('posts.create', 'posts.edit')
ON CONFLICT DO NOTHING;

COMMIT;
