-- Control de Actividades: panel de uso diario por área (Gerencia / Auditor).

BEGIN;

INSERT INTO permissions (code, name, module)
VALUES (
  'activity_control.view',
  'Ver control de actividades por área',
  'audit'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN', 'AUDITOR')
  AND p.code = 'activity_control.view'
ON CONFLICT DO NOTHING;

COMMIT;
