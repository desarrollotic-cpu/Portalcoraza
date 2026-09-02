-- =============================================================================
-- Migración 054 · Gestión Humana — Fechas de Curso de Vigilancia y Póliza SURA
-- =============================================================================
-- Añade columnas de fecha inicio/fin para el Curso de Vigilancia y la Póliza
-- de Seguro SURA directamente en la tabla associates.
-- Estas fechas alimentan el motor de alertas automáticas (VENCIMIENTO_CURSO_VIGILANCIA
-- y VENCIMIENTO_POLIZA) y se muestran en la ficha laboral del asociado.
-- =============================================================================

BEGIN;

ALTER TABLE associates
  ADD COLUMN IF NOT EXISTS surveillance_course_start DATE,
  ADD COLUMN IF NOT EXISTS surveillance_course_end   DATE,
  ADD COLUMN IF NOT EXISTS sura_policy_start         DATE,
  ADD COLUMN IF NOT EXISTS sura_policy_end           DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'hr_alert_type'::regtype
      AND enumlabel = 'VENCIMIENTO_CURSO_VIGILANCIA'
  ) THEN
    ALTER TYPE hr_alert_type ADD VALUE 'VENCIMIENTO_CURSO_VIGILANCIA';
  END IF;
END $$;

-- Ausentismo: hacer tipo (kind) y evento (event_type) opcionales
ALTER TABLE associate_absences
  ALTER COLUMN kind DROP NOT NULL,
  ALTER COLUMN event_type DROP NOT NULL;

COMMENT ON COLUMN associates.surveillance_course_start IS
  'Fecha de inicio del curso de vigilancia del asociado.';
COMMENT ON COLUMN associates.surveillance_course_end IS
  'Fecha de vencimiento del curso de vigilancia. Alimenta alertas VENCIMIENTO_CURSO_VIGILANCIA.';
COMMENT ON COLUMN associates.sura_policy_start IS
  'Fecha de inicio de la póliza de seguro SURA del asociado.';
COMMENT ON COLUMN associates.sura_policy_end IS
  'Fecha de vencimiento de la póliza SURA. Alimenta alertas VENCIMIENTO_POLIZA.';

COMMIT;
