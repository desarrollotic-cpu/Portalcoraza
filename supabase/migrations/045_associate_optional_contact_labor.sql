-- Allow creating associates with identity-only (contact/labor optional).
ALTER TABLE associates
  ALTER COLUMN mobile DROP NOT NULL,
  ALTER COLUMN hire_date DROP NOT NULL;
