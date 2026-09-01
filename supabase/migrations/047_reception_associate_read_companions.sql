-- RECEPCIONISTA: lectura completa de ficha de asociado (filtros + detalle).
-- Sin create/edit/upload/resolve.

BEGIN;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'RECEPCIONISTA'
  AND p.code IN (
    'job_positions.view',
    'work_centers.view',
    'catalogs.view',
    'hr_documents.view',
    'hr_alerts.view',
    'absences.view'
  )
ON CONFLICT DO NOTHING;

COMMIT;
