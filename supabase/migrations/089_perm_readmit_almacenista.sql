-- El rol ALMACENISTA (Almacén Medellín, Rionegro, Oriente) también puede reingresar asociados.
BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ALMACENISTA'
  AND p.code = 'retirements.readmit'
ON CONFLICT DO NOTHING;

COMMIT;
