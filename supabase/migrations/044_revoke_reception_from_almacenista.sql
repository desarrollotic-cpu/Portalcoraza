-- Revoke reception permissions wrongly granted to ALMACENISTA/SUPERVISOR
-- in 022_reception.sql (meant as temporary stand-in before RECEPCIONISTA existed).
-- Reception stays with GERENCIA + RECEPCIONISTA.

BEGIN;

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code IN ('ALMACENISTA', 'SUPERVISOR')
  AND p.code IN ('reception.view', 'reception.register', 'reception.exit');

INSERT INTO roles (code, name, description)
VALUES ('RECEPCIONISTA', 'Recepcionista', 'Registro y control de visitantes en recepción')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'RECEPCIONISTA'
  AND p.code IN ('reception.view', 'reception.register', 'reception.exit')
ON CONFLICT DO NOTHING;

COMMIT;
