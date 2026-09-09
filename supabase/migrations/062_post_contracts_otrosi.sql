-- Contratos y otrosí repetibles por puesto.
-- El contrato actual en `posts` se copia al primer bloque y se sigue sincronizando.

BEGIN;

CREATE TABLE IF NOT EXISTS post_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  contract_number VARCHAR(80),
  contract_start VARCHAR(80),
  contract_term VARCHAR(80),
  contract_end VARCHAR(80),
  basc VARCHAR(20),
  service_type VARCHAR(80),
  invoice_value VARCHAR(80),
  armed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_contracts_post
  ON post_contracts (post_id, sort_order);

CREATE TABLE IF NOT EXISTS post_otrosi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  number VARCHAR(80),
  type_text VARCHAR(200),
  date_text VARCHAR(80),
  invoice_value VARCHAR(80),
  service_type VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_otrosi_post
  ON post_otrosi (post_id, sort_order);

INSERT INTO post_contracts (
  tenant_id, post_id, sort_order,
  contract_number, contract_start, contract_term, contract_end,
  basc, service_type, armed
)
SELECT
  p.tenant_id,
  p.id,
  0,
  p.contract_number,
  p.contract_start,
  p.contract_term,
  p.contract_end,
  CASE
    WHEN p.basc IS TRUE THEN 'SI'
    WHEN p.basc IS FALSE THEN 'NO_APLICA'
    ELSE NULL
  END,
  p.service_type,
  COALESCE(p.armed, FALSE)
FROM posts p
WHERE p.contract_number IS NOT NULL
   OR p.contract_start IS NOT NULL
   OR p.contract_term IS NOT NULL
   OR p.contract_end IS NOT NULL
   OR p.basc IS NOT NULL
   OR p.service_type IS NOT NULL;

COMMIT;
