-- Portal Coraza: solo procesos internos. Retira dominio residencial.
-- Idempotente: seguro si las tablas/permisos ya no existen.

DO $$
BEGIN
  IF to_regclass('public.virtual_log') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS virtual_log_prevent_update ON virtual_log;
    DROP TRIGGER IF EXISTS virtual_log_prevent_delete ON virtual_log;
  END IF;
END $$;

DROP FUNCTION IF EXISTS prevent_virtual_log_mutation();

DROP TABLE IF EXISTS residential_incident_history CASCADE;
DROP TABLE IF EXISTS residential_incidents CASCADE;
DROP TABLE IF EXISTS virtual_log CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS mail_records CASCADE;
DROP TABLE IF EXISTS visitor_parking_history CASCADE;
DROP TABLE IF EXISTS visitor_parking_slots CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS owners CASCADE;
DROP TABLE IF EXISTS residents CASCADE;
DROP TABLE IF EXISTS residential_units CASCADE;

DROP TYPE IF EXISTS residential_incident_priority;
DROP TYPE IF EXISTS residential_incident_status;
DROP TYPE IF EXISTS package_status;
DROP TYPE IF EXISTS reservation_approval_mode;
DROP TYPE IF EXISTS reservation_status;

DELETE FROM role_permissions
WHERE permission_id IN (SELECT id FROM permissions WHERE module = 'residential');

DELETE FROM permissions WHERE module = 'residential';

-- Rol residencial fuera de alcance (idempotente; también cubierto por 017).
UPDATE users u
SET role_id = r_target.id,
    updated_at = NOW()
FROM roles r_old
JOIN roles r_target ON r_target.code = 'GERENCIA'
WHERE u.role_id = r_old.id
  AND r_old.code = 'ADMINISTRADOR_UNIDAD';

DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE code = 'ADMINISTRADOR_UNIDAD');

DELETE FROM roles
WHERE code = 'ADMINISTRADOR_UNIDAD';
