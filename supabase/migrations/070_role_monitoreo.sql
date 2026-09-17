-- Rol MONITOREO: visualización del módulo Programación (cuadro y panel), sin edición.
-- Se usa para que el personal de monitoreo pueda ver lo que arma el programador
-- sin poder modificar celdas, plantillas, publicar, motor ni recargos.

INSERT INTO roles (code, name, description)
VALUES (
  'MONITOREO',
  'Monitoreo',
  'Visualización de la programación (cuadro y panel), sin edición'
)
ON CONFLICT (code) DO NOTHING;

-- Asegurar que los permisos que necesita existan en el catálogo.
INSERT INTO permissions (code, name, module) VALUES
  ('scheduling.view', 'Ver programación', 'scheduling'),
  ('notifications.view', 'Ver notificaciones', 'notifications'),
  ('notifications.read', 'Marcar notificaciones como leídas', 'notifications')
ON CONFLICT (code) DO NOTHING;

-- Asignación de permisos al rol MONITOREO (idempotente).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'MONITOREO'
  AND p.code IN (
    'scheduling.view',
    'notifications.view',
    'notifications.read'
  )
ON CONFLICT DO NOTHING;
