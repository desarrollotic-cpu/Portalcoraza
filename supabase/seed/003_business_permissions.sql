-- Seed consolidado módulos de negocio (system-coraza-v2)
-- Idempotente: seguro re-ejecutar en BD ya sembrada con 001_roles_permissions.sql
-- Ejecutar después de 001 (y opcionalmente 002).

-- Rol operativo SUPERVISOR (widgets dashboard: turnos, entregas, novedades)
INSERT INTO roles (code, name, description) VALUES
  ('SUPERVISOR', 'Supervisor', 'Supervisión operativa de turnos, entregas y novedades')
ON CONFLICT (code) DO NOTHING;

-- Permisos de negocio (no duplicar si ya existen en 001)
INSERT INTO permissions (code, name, module) VALUES
  ('inventory.view', 'Ver inventario', 'inventory'),
  ('inventory.create', 'Crear inventario', 'inventory'),
  ('inventory.edit', 'Editar inventario', 'inventory'),
  ('inventory.move', 'Registrar movimientos de inventario', 'inventory'),
  ('inventory.alerts', 'Ver alertas de inventario', 'inventory'),
  ('deliveries.view', 'Ver entregas', 'deliveries'),
  ('deliveries.create', 'Crear entrega', 'deliveries'),
  ('deliveries.sign', 'Confirmar entrega con firma', 'deliveries'),
  ('scheduling.view', 'Ver programacion', 'scheduling'),
  ('scheduling.create', 'Crear turnos', 'scheduling'),
  ('scheduling.edit', 'Editar turnos', 'scheduling'),
  ('documental.view', 'Ver documental', 'documental'),
  ('documental.create', 'Crear registro documental', 'documental'),
  ('documental.manage', 'Gestionar tipos documentales', 'documental'),
  ('residential.view', 'Ver residencial', 'residential'),
  ('residential.manage', 'Gestionar unidades residenciales', 'residential'),
  ('residential.visitors', 'Gestionar visitantes', 'residential'),
  ('residential.packages', 'Gestionar paqueteria', 'residential'),
  ('residential.reservations', 'Gestionar reservas', 'residential'),
  ('residential.incidents', 'Gestionar novedades residenciales', 'residential'),
  ('residential.parking', 'Gestionar parqueaderos visitantes', 'residential'),
  ('notifications.view', 'Ver notificaciones', 'notifications'),
  ('notifications.read', 'Marcar notificaciones como leidas', 'notifications')
ON CONFLICT (code) DO NOTHING;

-- GERENCIA: todos los permisos de negocio + administración
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'GERENCIA' AND p.code IN (
  'users.view', 'users.create', 'users.edit',
  'roles.view', 'roles.manage',
  'associates.view', 'associates.create', 'associates.edit', 'associates.retire',
  'posts.view', 'posts.create', 'posts.edit',
  'audit.view',
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.move', 'inventory.alerts',
  'deliveries.view', 'deliveries.create', 'deliveries.sign',
  'scheduling.view', 'scheduling.create', 'scheduling.edit',
  'documental.view', 'documental.create', 'documental.manage',
  'residential.view', 'residential.manage', 'residential.visitors', 'residential.packages',
  'residential.reservations', 'residential.incidents', 'residential.parking',
  'notifications.view', 'notifications.read'
)
ON CONFLICT DO NOTHING;

-- SUPERVISOR: programación, entregas, novedades, puestos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SUPERVISOR' AND p.code IN (
  'associates.view',
  'posts.view',
  'scheduling.view', 'scheduling.create', 'scheduling.edit',
  'deliveries.view',
  'residential.incidents',
  'notifications.view', 'notifications.read'
)
ON CONFLICT DO NOTHING;

-- ALMACENISTA
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ALMACENISTA' AND p.code IN (
  'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.move', 'inventory.alerts',
  'deliveries.view', 'deliveries.create', 'deliveries.sign',
  'notifications.view', 'notifications.read'
)
ON CONFLICT DO NOTHING;

-- PROGRAMADOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'PROGRAMADOR' AND p.code IN (
  'associates.view', 'posts.view',
  'scheduling.view', 'scheduling.create', 'scheduling.edit',
  'notifications.view', 'notifications.read'
)
ON CONFLICT DO NOTHING;

-- ADMINISTRADOR_UNIDAD
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMINISTRADOR_UNIDAD' AND p.code IN (
  'residential.view', 'residential.manage', 'residential.visitors', 'residential.packages',
  'residential.reservations', 'residential.incidents', 'residential.parking',
  'notifications.view', 'notifications.read'
)
ON CONFLICT DO NOTHING;

-- RRHH
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RRHH' AND p.code IN (
  'associates.view', 'associates.create', 'associates.edit', 'associates.retire',
  'posts.view', 'audit.view',
  'documental.view',
  'notifications.view', 'notifications.read'
)
ON CONFLICT DO NOTHING;
