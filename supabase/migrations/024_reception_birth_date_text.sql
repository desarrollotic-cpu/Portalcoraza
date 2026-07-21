-- Fecha de nacimiento como texto libre (lectora de códigos / ingreso manual).

BEGIN;

ALTER TABLE reception_visitors
  ALTER COLUMN birth_date TYPE VARCHAR(40)
  USING CASE
    WHEN birth_date IS NULL THEN NULL
    ELSE to_char(birth_date, 'YYYY-MM-DD')
  END;

COMMIT;
