-- 072_associates_policy_level.sql
-- Añade el nivel de póliza (1..4) a cada asociado.
-- Escalonado por cargo/antigüedad (definición operativa la lleva RRHH).
-- Nulo = sin nivel asignado todavía.
ALTER TABLE associates
  ADD COLUMN IF NOT EXISTS policy_level SMALLINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'associates_policy_level_range'
  ) THEN
    ALTER TABLE associates
      ADD CONSTRAINT associates_policy_level_range
      CHECK (policy_level IS NULL OR (policy_level BETWEEN 1 AND 4));
  END IF;
END $$;

COMMENT ON COLUMN associates.policy_level IS
  'Nivel de cobertura de póliza de vida/accidentes del asociado (1..4). Escalonado por cargo/antigüedad.';
