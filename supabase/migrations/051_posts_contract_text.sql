-- Fecha inicial / final del contrato también son texto libre en el archivo
-- (INDEFINIDO, 24 MESES, AUTOMATICO, "2027-11-30 00:00:00").
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts'
      AND column_name = 'contract_start' AND data_type = 'date'
  ) THEN
    ALTER TABLE posts
      ALTER COLUMN contract_start TYPE VARCHAR(80) USING (contract_start::text),
      ALTER COLUMN contract_end TYPE VARCHAR(80) USING (contract_end::text);
  END IF;
END $$;

COMMIT;
