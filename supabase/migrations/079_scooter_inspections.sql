-- Inspección preoperacional patineta eléctrica (PESV).
-- Flag por puesto + registros inmutables (solo INSERT).

BEGIN;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tiene_patineta_electrica BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS scooter_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id),
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inspector_user_id UUID NOT NULL REFERENCES users(id),
  inspector_name VARCHAR(200) NOT NULL,
  receiving_scooter BOOLEAN NOT NULL,
  answers JSONB NOT NULL,
  apt_for_operation BOOLEAN NOT NULL,
  has_novelty BOOLEAN NOT NULL DEFAULT false,
  novelty_type VARCHAR(60),
  novelty_reported_to_supervisor BOOLEAN,
  novelty_withdrawn_from_service BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scooter_insp_tenant_fecha
  ON scooter_inspections (tenant_id, inspected_at DESC);
CREATE INDEX IF NOT EXISTS idx_scooter_insp_post
  ON scooter_inspections (post_id, inspected_at DESC);
CREATE INDEX IF NOT EXISTS idx_scooter_insp_apt
  ON scooter_inspections (tenant_id, apt_for_operation);

ALTER TABLE scooter_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scooter_inspections_tenant ON scooter_inspections;
CREATE POLICY scooter_inspections_tenant ON scooter_inspections
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

INSERT INTO permissions (code, name, module) VALUES
  ('scooter.view', 'Ver inspecciones de patineta eléctrica', 'scooter'),
  ('scooter.create', 'Registrar inspección de patineta eléctrica', 'scooter')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code IN ('scooter.view', 'scooter.create')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions ops ON ops.id = rp.permission_id AND ops.code = 'operations.view'
JOIN permissions p ON p.code = 'scooter.view'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions m ON m.id = rp.permission_id AND m.code = 'minuta.create'
JOIN permissions p ON p.code = 'scooter.create'
ON CONFLICT DO NOTHING;

COMMIT;
