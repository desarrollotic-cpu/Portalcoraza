-- Dotación, Programación, Contabilidad y Recepción: solo lectura del
-- directorio de personal (RRHH → Personal). Sin create/edit/retire.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('ALMACENISTA', 'PROGRAMADOR', 'RECEPCIONISTA')
  AND p.code = 'associates.view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT r.id, p.id
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions acc ON acc.id = rp.permission_id AND acc.code = 'accounting.view'
CROSS JOIN permissions p
WHERE p.code = 'associates.view'
ON CONFLICT DO NOTHING;

COMMIT;
