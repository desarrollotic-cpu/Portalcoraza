-- Rol NOMINA: consulta RRHH (solo lectura) + ver módulo Nómina.
-- Los filtros de Personal/Retiros usan job_positions/work_centers/catalogs.view.

INSERT INTO roles (code, name, description)
VALUES (
  'NOMINA',
  'Nómina',
  'Consulta de Gestión Humana (solo lectura) y módulo de Nómina'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, name, module) VALUES
  ('associates.view', 'Consultar asociados', 'associates'),
  ('job_positions.view', 'Ver cargos', 'hr'),
  ('work_centers.view', 'Ver centros de trabajo', 'hr'),
  ('catalogs.view', 'Ver catálogos HR', 'hr'),
  ('retirements.view', 'Ver retiros', 'hr'),
  ('hr_documents.view', 'Ver documentos de asociado', 'hr'),
  ('hr_alerts.view', 'Ver alertas HRM', 'hr'),
  ('hr_dashboard.view', 'Ver dashboard HRM', 'hr'),
  ('hr_compliance.view', 'Ver matriz de cumplimiento SST', 'hr'),
  ('hr_audit.view', 'Ver bitácora HRM', 'hr'),
  ('absences.view', 'Ver ausentismo', 'hr'),
  ('payroll.view', 'Ver Nómina y Colillas', 'payroll'),
  ('notifications.view', 'Ver notificaciones', 'notifications'),
  ('notifications.read', 'Marcar notificaciones como leidas', 'notifications')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'NOMINA'
  AND p.code IN (
    'associates.view',
    'job_positions.view',
    'work_centers.view',
    'catalogs.view',
    'retirements.view',
    'hr_documents.view',
    'hr_alerts.view',
    'hr_dashboard.view',
    'hr_compliance.view',
    'hr_audit.view',
    'absences.view',
    'payroll.view',
    'notifications.view',
    'notifications.read'
  )
ON CONFLICT DO NOTHING;
