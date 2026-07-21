-- Gerencia = usuario maestro: todos los permisos del sistema
-- (usuarios, roles y cualquier módulo operativo).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'GERENCIA'
ON CONFLICT DO NOTHING;
