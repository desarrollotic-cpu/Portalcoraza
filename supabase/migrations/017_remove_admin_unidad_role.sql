-- Quita el rol ADMINISTRADOR_UNIDAD del portal (módulo residencial fuera de alcance por ahora).

BEGIN;

UPDATE users u
SET role_id = r_target.id,
    updated_at = NOW()
FROM roles r_old
JOIN roles r_target ON r_target.code = 'GERENCIA'
WHERE u.role_id = r_old.id
  AND r_old.code = 'ADMINISTRADOR_UNIDAD';

DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE code = 'ADMINISTRADOR_UNIDAD');

DELETE FROM roles
WHERE code = 'ADMINISTRADOR_UNIDAD';

COMMIT;
