-- Migración 037: Periodos de Liquidación y Colillas de Pago para Asociados

CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'LIQUIDADO', 'APROBADO', 'CERRADO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  worked_days INT NOT NULL DEFAULT 30,
  transport_allowance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  night_surcharges NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  health_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pension_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_devengado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_deducido NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  net_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_period_associate UNIQUE (period_id, associate_id)
);

CREATE TABLE IF NOT EXISTS payroll_slip_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slip_id UUID NOT NULL REFERENCES payroll_slips(id) ON DELETE CASCADE,
  concept_code VARCHAR(50) NOT NULL,
  concept_name VARCHAR(150) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('DEVENGADO', 'DEDUCCION')),
  hours NUMERIC(6,2) DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slips_period ON payroll_slips(period_id);
CREATE INDEX IF NOT EXISTS idx_slips_associate ON payroll_slips(associate_id);
CREATE INDEX IF NOT EXISTS idx_slip_details_slip ON payroll_slip_details(slip_id);
