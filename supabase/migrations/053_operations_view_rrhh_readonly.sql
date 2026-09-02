-- Operaciones deja de colgarse de posts.view: Recepción consulta puestos
-- en su módulo sin ver /operaciones.
-- RRHH: centros de trabajo y puestos solo lectura (alta = Recepción).

BEGIN;

INSERT INTO permissions (code, name, module) VALUES
  ('operations.view', 'Ver módulo Operaciones', 'operaciones')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT r.id, p.id
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions pv ON pv.id = rp.permission_id AND pv.code = 'posts.view'
CROSS JOIN permissions p
WHERE p.code = 'operations.view'
  AND r.code <> 'RECEPCIONISTA'
ON CONFLICT DO NOTHING;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'RECEPCIONISTA'
  AND p.code = 'operations.view';

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'RRHH'
  AND p.code IN (
    'posts.create',
    'posts.edit',
    'work_centers.create',
    'work_centers.edit'
  );

COMMIT;
