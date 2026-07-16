-- Rol operativo RECEPCIONISTA para el módulo Recepción.

BEGIN;

INSERT INTO roles (code, name, description)
VALUES ('RECEPCIONISTA', 'Recepcionista', 'Registro y control de visitantes en recepción')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'RECEPCIONISTA'
  AND p.code IN ('reception.view', 'reception.register', 'reception.exit')
ON CONFLICT DO NOTHING;

COMMIT;
