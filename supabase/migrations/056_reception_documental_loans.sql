-- RECEPCIONISTA: solo el submódulo Préstamos de Documental.
-- No otorga documental.view (panel, contratos, correspondencia, etc.).

BEGIN;

INSERT INTO permissions (code, name, module)
VALUES ('documental.loans', 'Gestionar préstamos documentales', 'documental')
ON CONFLICT (code) DO NOTHING;

-- Quien ya ve Documental sigue pudiendo préstamos si el API exige documental.loans.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions existing ON existing.id = rp.permission_id AND existing.code = 'documental.view'
JOIN permissions p ON p.code = 'documental.loans'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'documental.loans'
WHERE r.code = 'RECEPCIONISTA'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'documental.loans'
WHERE r.code = 'GERENCIA'
ON CONFLICT DO NOTHING;

COMMIT;
