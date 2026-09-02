-- Cursos/certificados: fecha de inicio + archivo opcional.
-- Ausentismo: evento deja de ser obligatorio.

BEGIN;

ALTER TABLE associate_documents
  ADD COLUMN IF NOT EXISTS issued_date DATE;

ALTER TABLE associate_documents
  ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE associate_absences
  ALTER COLUMN event_type DROP NOT NULL;

COMMIT;
