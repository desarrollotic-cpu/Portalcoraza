-- Reversa: rol INTERVENTOR no se usa (pedido erróneo).

BEGIN;

-- Si alguien quedó con ese rol, pásalo a AUDITOR (solo lectura).
UPDATE users u
SET role_id = r_target.id,
    updated_at = NOW()
FROM roles r_old
JOIN roles r_target ON r_target.code = 'AUDITOR'
WHERE u.role_id = r_old.id
  AND r_old.code = 'INTERVENTOR';

DELETE FROM role_permissions rp
USING roles r
WHERE rp.role_id = r.id
  AND r.code = 'INTERVENTOR';

DELETE FROM roles WHERE code = 'INTERVENTOR';

COMMIT;
