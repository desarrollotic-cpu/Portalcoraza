-- Recepción: marcar si el visitante es asociado ACTIVO/VACACIONES al registrar.

ALTER TABLE reception_visitors
  ADD COLUMN IF NOT EXISTS is_associate BOOLEAN NOT NULL DEFAULT FALSE;
