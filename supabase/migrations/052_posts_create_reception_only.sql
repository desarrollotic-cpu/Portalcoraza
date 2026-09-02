-- Solo RECEPCIONISTA crea puestos de trabajo.
-- Operaciones (y el resto de roles, incluida GERENCIA) conservan ver/editar
-- si ya los tenían; se les quita posts.create.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'RECEPCIONISTA'
  AND p.code = 'posts.create'
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND p.code = 'posts.create'
  AND r.code <> 'RECEPCIONISTA';

COMMIT;
