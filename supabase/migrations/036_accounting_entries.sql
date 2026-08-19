-- Migración 036: Comprobantes Contables y Asientos de Partida Doble

CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(30) UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  concept TEXT NOT NULL,
  source_module VARCHAR(50) NOT NULL CHECK (source_module IN ('NOMINA', 'DOTACION', 'FACTURACION', 'RECAUDO', 'MANUAL')),
  source_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'ASENTADO' CHECK (status IN ('BORRADOR', 'ASENTADO', 'ANULADO')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_entry_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE CASCADE,
  account_code VARCHAR(10) NOT NULL REFERENCES puc_accounts(code),
  debit_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
  cost_center VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_source ON accounting_entries(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON accounting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entry_details_entry ON accounting_entry_details(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_details_account ON accounting_entry_details(account_code);
