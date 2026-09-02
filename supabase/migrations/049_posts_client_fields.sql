-- Extiende `posts` con campos de asociado de negocio (cliente),
-- contrato, rep legal/contacto, documentos y fechas de verificación.
-- Todos NULL-safe para no romper datos existentes.

BEGIN;

-- Algunos "teléfonos" del archivo traen 2-3 números etiquetados; ampliar largo
ALTER TABLE posts ALTER COLUMN phone TYPE VARCHAR(200);
ALTER TABLE posts ALTER COLUMN contact_name TYPE VARCHAR(200);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS nit VARCHAR(30),
  ADD COLUMN IF NOT EXISTS sector VARCHAR(30),
  ADD COLUMN IF NOT EXISTS basc BOOLEAN,
  ADD COLUMN IF NOT EXISTS contract_start DATE,
  ADD COLUMN IF NOT EXISTS contract_end DATE,
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS legal_rep_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS legal_rep_id VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS observations TEXT,
  ADD COLUMN IF NOT EXISTS doc_camara_comercio BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_rut BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_cc_rep_legal BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_tratamiento_datos BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_formulario_asociado BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_acuerdo_seguridad BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_visita_cliente BOOLEAN,
  ADD COLUMN IF NOT EXISTS doc_estados_financieros VARCHAR(80),
  ADD COLUMN IF NOT EXISTS doc_rues_camara BOOLEAN,
  ADD COLUMN IF NOT EXISTS verif_encuesta_satisfaccion DATE,
  ADD COLUMN IF NOT EXISTS verif_ofac_rl DATE,
  ADD COLUMN IF NOT EXISTS verif_ofac_persona_juridica DATE,
  ADD COLUMN IF NOT EXISTS verif_central_riesgos_pn DATE,
  ADD COLUMN IF NOT EXISTS verif_central_riesgos_nit DATE,
  ADD COLUMN IF NOT EXISTS verif_procuraduria_nit DATE,
  ADD COLUMN IF NOT EXISTS verif_procuraduria_rl DATE,
  ADD COLUMN IF NOT EXISTS verif_procuraduria_rls DATE,
  ADD COLUMN IF NOT EXISTS verif_procuraduria_rev_fiscal_ppal DATE,
  ADD COLUMN IF NOT EXISTS verif_procuraduria_rev_fiscal_sup DATE,
  ADD COLUMN IF NOT EXISTS verif_procuraduria_miembros_junta DATE,
  ADD COLUMN IF NOT EXISTS verif_policia_rp DATE,
  ADD COLUMN IF NOT EXISTS verif_policia_rp_sup DATE,
  ADD COLUMN IF NOT EXISTS verif_policia_rev_fiscal DATE,
  ADD COLUMN IF NOT EXISTS verif_policia_rev_fiscal_sup DATE,
  ADD COLUMN IF NOT EXISTS verif_policia_miembros_junta DATE,
  ADD COLUMN IF NOT EXISTS verif_contraloria_rp DATE,
  ADD COLUMN IF NOT EXISTS verif_contraloria_rp_sup DATE,
  ADD COLUMN IF NOT EXISTS verif_contraloria_rev_fiscal DATE,
  ADD COLUMN IF NOT EXISTS verif_contraloria_rev_fiscal_sup DATE,
  ADD COLUMN IF NOT EXISTS verif_contraloria_miembros_junta DATE,
  ADD COLUMN IF NOT EXISTS verif_supersociedades DATE;

CREATE INDEX IF NOT EXISTS idx_posts_nit ON posts (nit);
CREATE INDEX IF NOT EXISTS idx_posts_sector ON posts (sector);
CREATE INDEX IF NOT EXISTS idx_posts_contract_start ON posts (contract_start);
CREATE INDEX IF NOT EXISTS idx_posts_contract_end ON posts (contract_end);

COMMIT;
