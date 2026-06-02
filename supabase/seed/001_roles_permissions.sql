-- Roles iniciales System Coraza
INSERT INTO roles (code, name, description) VALUES
  ('GERENCIA', 'Gerencia', 'Dirección y visión global'),
  ('RRHH', 'Recursos Humanos', 'Gestión de asociados'),
  ('PROGRAMADOR', 'Programador', 'Programación de personal'),
  ('ALMACENISTA', 'Almacenista', 'Dotación e inventario'),
  ('VIGILANTE', 'Vigilante', 'Personal operativo'),
  ('ADMINISTRADOR_UNIDAD', 'Administrador de Unidad', 'Gestión de unidad residencial')
ON CONFLICT (code) DO NOTHING;

-- Permisos base Fase 1
INSERT INTO permissions (code, name, module) VALUES
  ('users.view', 'Ver usuarios', 'users'),
  ('users.create', 'Crear usuarios', 'users'),
  ('users.edit', 'Editar usuarios', 'users'),
  ('roles.view', 'Ver roles', 'roles'),
  ('roles.manage', 'Gestionar roles y permisos', 'roles'),
  ('associates.view', 'Consultar asociados', 'associates'),
  ('associates.create', 'Crear asociado', 'associates'),
  ('associates.edit', 'Editar asociado', 'associates'),
  ('associates.retire', 'Retirar asociado', 'associates'),
  ('posts.view', 'Ver puestos', 'posts'),
  ('posts.create', 'Crear puesto', 'posts'),
  ('posts.edit', 'Editar puesto', 'posts'),
  ('audit.view', 'Ver auditoría', 'audit')
ON CONFLICT (code) DO NOTHING;

-- RRHH: asociados completo + consulta puestos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'RRHH' AND p.code IN (
  'associates.view', 'associates.create', 'associates.edit', 'associates.retire',
  'posts.view', 'audit.view'
)
ON CONFLICT DO NOTHING;

-- GERENCIA: administrador del sistema (Fase 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'GERENCIA' AND p.code IN (
  'users.view', 'users.create', 'users.edit',
  'roles.view', 'roles.manage',
  'associates.view', 'associates.create', 'associates.edit', 'associates.retire',
  'posts.view', 'posts.create', 'posts.edit',
  'audit.view'
)
ON CONFLICT DO NOTHING;

-- PROGRAMADOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'PROGRAMADOR' AND p.code IN ('associates.view', 'posts.view')
ON CONFLICT DO NOTHING;
