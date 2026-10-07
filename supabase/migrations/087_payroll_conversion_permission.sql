-- Permiso para la opción "Conversión de nómina" (Consolidado → BASE).
-- Se asigna al rol NOMINA. Idempotente.

BEGIN;

INSERT INTO permissions (code, name, module) VALUES
  ('payroll.convert', 'Conversión de nómina (Consolidado → BASE)', 'payroll')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'NOMINA'
  AND p.code = 'payroll.convert'
ON CONFLICT DO NOTHING;

COMMIT;
