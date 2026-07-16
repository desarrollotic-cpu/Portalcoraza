-- Elimina roles de portal SST y CONSULTA (ya no se usan).
-- Si hay usuarios con esos roles, se reasignan a RRHH antes de borrar.

BEGIN;

-- Reasignar usuarios huérfanos al rol RRHH (si existe)
UPDATE users u
SET role_id = r_rrhh.id,
    updated_at = NOW()
FROM roles r_old
JOIN roles r_rrhh ON r_rrhh.code = 'RRHH'
WHERE u.role_id = r_old.id
  AND r_old.code IN ('SST', 'CONSULTA');

-- Quitar permisos de esos roles
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE code IN ('SST', 'CONSULTA'));

-- Borrar roles
DELETE FROM roles
WHERE code IN ('SST', 'CONSULTA');

COMMIT;
