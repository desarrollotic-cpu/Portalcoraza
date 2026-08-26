-- Migración 036: Creación del Rol Sistema de Gestión (SIG)
-- Permite la gestión de indicadores SIG-KPI, SST, Calidad, Documentación y Auditoría.

INSERT INTO roles (code, name, description)
VALUES (
  'SIG',
  'Sistema de Gestión',
  'Gestión Integral de Calidad, Indicadores SIG-KPI, SST, Procesos y Auditoría'
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Permisos asignados al rol Sistema de Gestión
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'SIG'
  AND (
    p.code LIKE 'sig.%'
    OR p.code LIKE 'sst.%'
    OR p.code LIKE 'documental.%'
    OR p.code LIKE '%.view'
    OR p.code IN (
      'inventory.alerts',
      'hr_alerts.view',
      'hr_dashboard.view',
      'hr_audit.view',
      'hr_export.excel',
      'audit.view'
    )
  )
ON CONFLICT DO NOTHING;
