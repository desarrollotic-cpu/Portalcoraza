-- Migración 035: Plan Único de Cuentas (PUC) en Colombia para Seguridad Privada

CREATE TABLE IF NOT EXISTS puc_accounts (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO', 'COSTO')),
  level INT NOT NULL CHECK (level BETWEEN 1 AND 6),
  allows_movement BOOLEAN NOT NULL DEFAULT true,
  parent_code VARCHAR(10) REFERENCES puc_accounts(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puc_parent ON puc_accounts(parent_code);
CREATE INDEX IF NOT EXISTS idx_puc_type ON puc_accounts(type);

-- Insertar cuentas PUC base indispensables para Operación y Nómina de Seguridad Privada
INSERT INTO puc_accounts (code, name, type, level, allows_movement, parent_code) VALUES
('1', 'ACTIVO', 'ACTIVO', 1, false, NULL),
('11', 'EFECTIVO Y EQUIVALENTES DE EFECTIVO', 'ACTIVO', 2, false, '1'),
('1105', 'CAJA', 'ACTIVO', 3, false, '11'),
('110505', 'Caja General', 'ACTIVO', 4, true, '1105'),
('1110', 'BANCOS', 'ACTIVO', 3, false, '11'),
('111005', 'Bancos Nacionales', 'ACTIVO', 4, true, '1110'),
('13', 'CUENTAS POR COBRAR', 'ACTIVO', 2, false, '1'),
('1305', 'CLIENTES', 'ACTIVO', 3, false, '13'),
('130505', 'Clientes Nacionales - Vigilancia', 'ACTIVO', 4, true, '1305'),
('14', 'INVENTARIOS', 'ACTIVO', 2, false, '1'),
('1435', 'MERCANCÍAS NO FABRICADAS / DOTACIÓN', 'ACTIVO', 3, false, '14'),
('143505', 'Inventario de Uniformes y Elementos', 'ACTIVO', 4, true, '1435'),
('2', 'PASIVO', 'PASIVO', 1, false, NULL),
('23', 'CUENTAS POR PAGAR', 'PASIVO', 2, false, '2'),
('2370', 'RETENCIONES Y APORTES DE NÓMINA', 'PASIVO', 3, false, '23'),
('237005', 'Aportes a Salud (EPS)', 'PASIVO', 4, true, '2370'),
('237010', 'Aportes a Pensión (AFP)', 'PASIVO', 4, true, '2370'),
('237015', 'Aportes a ARL (Nivel V)', 'PASIVO', 4, true, '2370'),
('25', 'OBLIGACIONES LABORALES', 'PASIVO', 2, false, '2'),
('2505', 'SALARIOS POR PAGAR', 'PASIVO', 3, false, '25'),
('250505', 'Nómina por Pagar a Asociados', 'PASIVO', 4, true, '2505'),
('4', 'INGRESOS', 'INGRESO', 1, false, NULL),
('41', 'OPERACIONALES', 'INGRESO', 2, false, '4'),
('4135', 'COMERCIO / SERVICIOS DE SEGURIDAD', 'INGRESO', 3, false, '41'),
('413505', 'Servicios de Vigilancia y Seguridad Privada', 'INGRESO', 4, true, '4135'),
('5', 'GASTOS', 'GASTO', 1, false, NULL),
('51', 'OPERACIONALES DE ADMINISTRACIÓN / PERSONAL', 'GASTO', 2, false, '5'),
('5105', 'GASTOS DE PERSONAL', 'GASTO', 3, false, '51'),
('510506', 'Sueldos Básicos Vigilancia', 'GASTO', 4, true, '5105'),
('510515', 'Horas Extras y Recargos Nocturnos', 'GASTO', 4, true, '5105'),
('510527', 'Auxilio de Transporte', 'GASTO', 4, true, '5105'),
('510568', 'Dotación y Suministros a Personal', 'GASTO', 4, true, '5105')
ON CONFLICT (code) DO NOTHING;
