-- Bienestar: ingreso al portal solo para consultar Personal (GH). Sin create/edit.

BEGIN;

INSERT INTO roles (code, name, description)
VALUES (
  'BIENESTAR',
  'Bienestar',
  'Consulta de personal de Gestión Humana. Sin edición.'
)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'BIENESTAR'
  AND p.code = 'associates.view'
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'BIENESTAR'
  AND p.code LIKE 'associates.%'
  AND p.code <> 'associates.view';

COMMIT;
