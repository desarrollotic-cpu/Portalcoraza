-- Si ya ejecutaste 001 con permisos limitados, ejecuta este parche:
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
