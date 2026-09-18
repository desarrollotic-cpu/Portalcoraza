-- Registrar el permiso `retirements.readmit` (reingreso de asociados retirados/inactivos).
-- Este permiso existía en scripts de seed pero nunca en una migración versionada,
-- por eso no aparecía en producción y ningún rol podía usar el botón "Reingresar".

BEGIN;

INSERT INTO permissions (code, name, module)
VALUES ('retirements.readmit', 'Reingresar asociado (RETIRADO/INACTIVO)', 'hr')
ON CONFLICT (code) DO NOTHING;

-- Asignarlo a los roles que gestionan personal: GERENCIA y RRHH (Gestión Humana).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('GERENCIA', 'RRHH')
  AND p.code = 'retirements.readmit'
ON CONFLICT DO NOTHING;

COMMIT;
