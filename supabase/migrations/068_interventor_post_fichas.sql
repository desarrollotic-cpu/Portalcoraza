-- Rol INTERVENTOR: consulta de fichas de puestos (Recepción).
-- Solo lectura: reception.view + posts.view (sin registrar visitantes ni crear puestos).

BEGIN;

INSERT INTO roles (code, name, description)
VALUES (
  'INTERVENTOR',
  'Interventor',
  'Consulta de fichas de puestos y módulo Recepción (solo lectura)'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'INTERVENTOR'
  AND p.code IN ('reception.view', 'posts.view')
ON CONFLICT DO NOTHING;

COMMIT;
