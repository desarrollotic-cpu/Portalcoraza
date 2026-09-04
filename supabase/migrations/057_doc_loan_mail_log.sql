-- Trazabilidad de correos de préstamos documentales (aprobación, rechazo, vencimiento, devolución).
CREATE TABLE IF NOT EXISTS doc_loan_mail_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111',
  loan_id uuid NOT NULL REFERENCES doc_loans(id) ON DELETE CASCADE,
  kind varchar(40) NOT NULL,
  to_email varchar(150) NOT NULL,
  subject varchar(300),
  success boolean NOT NULL DEFAULT false,
  provider varchar(20),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_loan_mail_log_loan ON doc_loan_mail_log (loan_id, created_at DESC);

COMMENT ON TABLE doc_loan_mail_log IS 'Registro de correos enviados (o fallidos) por cada préstamo documental';
