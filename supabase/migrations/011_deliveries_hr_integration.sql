-- Integración Dotación ↔ RRHH: permiso de reversión dedicado
INSERT INTO permissions (code, name, module) VALUES
  ('deliveries.revert', 'Revertir entrega confirmada', 'deliveries')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('ALMACENISTA', 'GERENCIA') AND p.code = 'deliveries.revert'
ON CONFLICT DO NOTHING;
