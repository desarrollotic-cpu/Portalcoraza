-- Folio Superintendencia 0–199 (cíclico) por puesto y tipo de minuta.

CREATE TABLE IF NOT EXISTS minuta_folio_counter (
  post_id UUID NOT NULL,
  modulo TEXT NOT NULL,
  last_folio INT NOT NULL DEFAULT -1,
  PRIMARY KEY (post_id, modulo)
);

ALTER TABLE minuta_visitantes ADD COLUMN IF NOT EXISTS folio INT;
ALTER TABLE minuta_correspondencia ADD COLUMN IF NOT EXISTS folio INT;
ALTER TABLE minuta_contratistas ADD COLUMN IF NOT EXISTS folio INT;
ALTER TABLE minuta_domiciliarios ADD COLUMN IF NOT EXISTS folio INT;
ALTER TABLE minuta_incidentes ADD COLUMN IF NOT EXISTS folio INT;
ALTER TABLE minuta_servicio ADD COLUMN IF NOT EXISTS folio INT;
ALTER TABLE minuta_entrega_puesto ADD COLUMN IF NOT EXISTS folio INT;
