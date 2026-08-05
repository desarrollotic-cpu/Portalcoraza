-- Rol AUDITOR: consulta de todos los módulos, sin altas/ediciones/gestión.
-- Idempotente. Ejecutar después de 001–004 y migraciones de permisos.

INSERT INTO roles (code, name, description) VALUES
  (
    'AUDITOR',
    'Auditor',
    'Consulta de todos los módulos del portal sin capacidad de modificación'
  )
ON CONFLICT (code) DO NOTHING;

-- Solo lectura: *.view + alertas de inventario (consulta) + export Excel HR (sin mutar datos).
-- Excluye notifications.read (marca leídas = escritura).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'AUDITOR'
  AND (
    p.code LIKE '%.view'
    OR p.code IN ('inventory.alerts', 'hr_export.excel')
  )
ON CONFLICT DO NOTHING;
