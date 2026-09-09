-- Almacenista entrega desde Dotación → Asociados.
-- No entra a RRHH ni ve "Personal" (associates.view abre /rrhh).

BEGIN;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'ALMACENISTA'
  AND p.code = 'associates.view';

COMMIT;
