-- Portal Coraza: solo procesos internos. Retira dominio residencial.
-- Idempotente: seguro si las tablas/permisos ya no existen.

DROP TRIGGER IF EXISTS virtual_log_prevent_update ON virtual_log;
DROP TRIGGER IF EXISTS virtual_log_prevent_delete ON virtual_log;
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
