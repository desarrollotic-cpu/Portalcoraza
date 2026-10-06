-- Control de radio: contactos por puesto / franja (matriz tipo Excel).
-- Purge anual: diferido (este módulo será candidato a limpieza >12 meses).

BEGIN;

CREATE TABLE IF NOT EXISTS radio_control_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status VARCHAR(8) NOT NULL,
  notes TEXT,
  checked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT radio_control_checks_status_chk
    CHECK (status IN ('S/N', 'N/C', 'N/A', 'C/N')),
  CONSTRAINT radio_control_checks_uniq
    UNIQUE (tenant_id, post_id, check_date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_radio_control_date
  ON radio_control_checks (tenant_id, check_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_radio_control_post
  ON radio_control_checks (tenant_id, post_id, check_date);

INSERT INTO permissions (code, name, module) VALUES
  ('radio_control.view', 'Ver control de radio', 'radio_control'),
  ('radio_control.edit', 'Registrar contactos de radio', 'radio_control')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code IN ('radio_control.view', 'radio_control.edit')
ON CONFLICT DO NOTHING;

-- Quien ya opera puestos también ve/edita control de radio.
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions ops ON ops.id = rp.permission_id AND ops.code = 'operations.view'
CROSS JOIN permissions p
WHERE p.code IN ('radio_control.view', 'radio_control.edit')
ON CONFLICT DO NOTHING;

COMMIT;
