-- Campos operativos de puesto (paridad con la app de programación).
-- No borra columnas existentes.

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS zone VARCHAR(80),
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contract_number VARCHAR(80),
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(80),
  ADD COLUMN IF NOT EXISTS armed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT;
