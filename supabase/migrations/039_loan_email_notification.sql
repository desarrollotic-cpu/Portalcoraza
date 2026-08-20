-- Migración 039: Agregar campo email y fecha de notificación de vencimiento a doc_loans
ALTER TABLE doc_loans ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE doc_loans ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN doc_loans.email IS 'Correo electrónico del solicitante para notificaciones y alertas de vencimiento';
COMMENT ON COLUMN doc_loans.overdue_notified_at IS 'Fecha y hora en que se envió el correo de notificación por vencimiento';
