-- ALMACENISTA: acceso completo a Personal (ver / crear / editar asociados).
-- No otorga retiros, import, alertas ni panel SST.
-- Reversión parcial de 061 (solo associates.view); ahora también create/edit.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ALMACENISTA'
  AND p.code IN ('associates.view', 'associates.create', 'associates.edit')
ON CONFLICT DO NOTHING;

COMMIT;
