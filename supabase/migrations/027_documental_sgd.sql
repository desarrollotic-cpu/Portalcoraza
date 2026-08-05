-- Gestión Documental SGD CORAZA (nativo)
-- Migración de los 11 módulos del SGD a Portal Coraza.
-- Reglas de negocio documentadas en docs/GESTION-DOCUMENTAL-SGD.md
-- Convenciones: uuid PK, snake_case, users FK, trigger set_updated_at, permisos documental.*

BEGIN;

-- ============================================================
-- 0. CONTADORES DE CONSECUTIVOS (reemplaza el MAX()+forEach del SGD)
--    scope identifica el ámbito, p.ej. 'contract', 'minute:SERVICIO',
--    'correspondence:400', 'retired_personnel'. El incremento se hace
--    con UPDATE ... RETURNING dentro de una transacción (bloqueo de fila).
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_counters (
  scope       VARCHAR(120) PRIMARY KEY,
  last_value  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contratos SGD arrancan en 399 (base histórica 398).
INSERT INTO doc_counters (scope, last_value) VALUES ('contract', 398)
ON CONFLICT (scope) DO NOTHING;

-- ============================================================
-- 1. TABLA DE RETENCIÓN DOCUMENTAL (TRD)
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_retention_table (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dependency_code     VARCHAR(10) NOT NULL,
  dependency_name     VARCHAR(120) NOT NULL,
  series_code         VARCHAR(10) NOT NULL,
  series_name         VARCHAR(120) NOT NULL,
  subseries_code      VARCHAR(10),
  subseries_name      VARCHAR(120),
  management_years    INTEGER,
  central_years       INTEGER,
  final_disposition   VARCHAR(120),
  legal_basis         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. CORRESPONDENCIA
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_correspondence (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_code       VARCHAR(60) UNIQUE,          -- radicado TRD
  numeric_code        INTEGER,
  document_date       DATE,
  medium              VARCHAR(30),
  document_type       VARCHAR(120),
  origin_dept         VARCHAR(10) NOT NULL,
  destination_dept    VARCHAR(10),
  subject             TEXT,
  detail              TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  voxelsera           VARCHAR(50),
  registered_by       UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. MINUTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_minutes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  minute_type         VARCHAR(60) NOT NULL,        -- SERVICIO | VISITANTES | CORRESPONDENCIA
  post_name           VARCHAR(150),
  start_date          DATE,
  close_date          DATE,
  observations        TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  unique_code         VARCHAR(60),                 -- MIN-{SER|VIS|COR}-####
  numeric_code        INTEGER,
  voxelsera           VARCHAR(50),
  responsible         UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. ASOCIADOS RETIRADOS / PERSONAL INACTIVO
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_retired_personnel (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name           VARCHAR(150) NOT NULL,
  id_number           VARCHAR(50) NOT NULL UNIQUE, -- cédula
  retirement_date     DATE,
  retirement_reason   TEXT,
  observations        TEXT,
  person_type         VARCHAR(40) NOT NULL DEFAULT 'EMPLEADO',
  numeric_code        INTEGER,
  voxelsera           VARCHAR(50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. CONTRATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_contracts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_type       VARCHAR(120),
  contract_number     VARCHAR(120) UNIQUE,         -- CTR-{n}-{año}
  numeric_code        INTEGER,
  party_a             VARCHAR(150),
  party_b             VARCHAR(150),
  nit                 VARCHAR(50),
  start_date          DATE,
  end_date            DATE,
  contract_value      NUMERIC(15,2),
  contract_object     TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'VIGENTE',
  voxelsera           VARCHAR(50),
  source_sheet        VARCHAR(120),                -- hoja_origen (rastro de import)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. WORKFLOWS (aprobaciones, p.ej. contratos de alto valor)
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_workflows (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_type       VARCHAR(120),
  document_id         UUID,                        -- referencia libre (contrato, etc.)
  requester           VARCHAR(120),
  approver            VARCHAR(120),
  due_date            DATE,
  status              VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  comments            TEXT,
  approval_comments   TEXT,
  sla_days            INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. PRÉSTAMOS DE DOCUMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_loans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester             VARCHAR(150) NOT NULL,
  department            VARCHAR(80),
  document              VARCHAR(200),
  document_code         VARCHAR(60),
  loan_date             DATE,
  return_date           DATE,
  real_return_date      DATE,
  status                VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
  observations          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. BIBLIOTECA: CARPETAS + ARCHIVOS
-- ============================================================
CREATE TABLE IF NOT EXISTS doc_library_folders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(120) NOT NULL,
  parent_id           UUID REFERENCES doc_library_folders(id) ON DELETE SET NULL,
  color               VARCHAR(20) DEFAULT '#2563eb',
  is_system           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doc_library_files (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(150) NOT NULL,
  category            VARCHAR(120),
  version             VARCHAR(20) DEFAULT '1.0',
  status              VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',  -- ACTIVO | ELIMINADO (borrado lógico)
  url                 TEXT,
  elaboration_date    DATE,
  change_description  TEXT,
  responsible         VARCHAR(120),
  folder_id           UUID REFERENCES doc_library_folders(id) ON DELETE SET NULL,
  storage_provider    VARCHAR(40),
  registered_by       UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_doc_corr_origin ON doc_correspondence(origin_dept);
CREATE INDEX IF NOT EXISTS idx_doc_corr_status ON doc_correspondence(status);
CREATE INDEX IF NOT EXISTS idx_doc_minutes_type ON doc_minutes(minute_type);
CREATE INDEX IF NOT EXISTS idx_doc_contracts_numeric ON doc_contracts(numeric_code DESC);
CREATE INDEX IF NOT EXISTS idx_doc_contracts_status ON doc_contracts(status);
CREATE INDEX IF NOT EXISTS idx_doc_loans_status ON doc_loans(status);
CREATE INDEX IF NOT EXISTS idx_doc_loans_return ON doc_loans(return_date);
CREATE INDEX IF NOT EXISTS idx_doc_library_files_folder ON doc_library_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_doc_workflows_status ON doc_workflows(status);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE TRIGGER doc_retention_table_updated_at BEFORE UPDATE ON doc_retention_table
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_correspondence_updated_at BEFORE UPDATE ON doc_correspondence
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_minutes_updated_at BEFORE UPDATE ON doc_minutes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_retired_personnel_updated_at BEFORE UPDATE ON doc_retired_personnel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_contracts_updated_at BEFORE UPDATE ON doc_contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_workflows_updated_at BEFORE UPDATE ON doc_workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_loans_updated_at BEFORE UPDATE ON doc_loans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_library_folders_updated_at BEFORE UPDATE ON doc_library_folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER doc_library_files_updated_at BEFORE UPDATE ON doc_library_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEMILLA TRD (5 dependencias de ley — AGN / Ley 594)
-- ============================================================
INSERT INTO doc_retention_table
  (dependency_code, dependency_name, series_code, series_name, subseries_code, subseries_name, management_years, central_years, final_disposition, legal_basis)
VALUES
  ('100','GERENCIA GENERAL','10','COMUNICACIONES OFICIALES','01','CARTAS Y MEMORANDOS',2,8,'CONSERVACION TOTAL','Código de Comercio Art. 60 / Ley 594'),
  ('200','GESTION HUMANA','20','HISTORIAS LABORALES Y SG-SST','01','EXAMENES MEDICOS Y SALUD OCUPACIONAL',5,15,'CONSERVACION TOTAL (20 AÑOS)','Decreto 1072 de 2015 SG-SST'),
  ('300','FINANCIERA Y CONTABLE','30','REGISTROS Y COMPROBANTES CONTABLES','01','COMPROBANTES DE PAGO Y FACTURAS',3,7,'ELIMINACION REGULADA','Ley 527 de 1999 / C.Co Art. 60'),
  ('400','OPERACIONES Y SEGURIDAD','40','MINUTAS Y REPORTES OPERATIVOS','01','NOVEDADES Y SEGUIMIENTO DE PUESTO',2,3,'SELECCION','Ley 594 de 2000 AGN'),
  ('500','JURIDICA Y CONTRATOS','50','CONTRATOS Y CONVENIOS','01','CONTRATOS COMERCIALES Y LABORALES',5,15,'CONSERVACION TOTAL','Ley 80 / Código de Comercio')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEMILLA BIBLIOTECA: 5 carpetas de sistema
-- ============================================================
INSERT INTO doc_library_folders (name, color, is_system) VALUES
  ('Políticas Institucionales', '#2563eb', TRUE),
  ('Manuales de Operaciones', '#06b6d4', TRUE),
  ('Reglamentos y Formatos CTA', '#f59e0b', TRUE),
  ('Seguridad y Salud SG-SST', '#10b981', TRUE),
  ('Documentación Jurídica', '#8b5cf6', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PERMISOS
-- ============================================================
INSERT INTO permissions (code, name, module) VALUES
  ('documental.view',   'Ver módulo de gestión documental', 'documental'),
  ('documental.create', 'Registrar documentos (correspondencia, minutas, etc.)', 'documental'),
  ('documental.manage', 'Administrar documental (biblioteca, préstamos, workflows)', 'documental')
ON CONFLICT (code) DO NOTHING;

-- Gerencia: todos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'GERENCIA'
  AND p.code IN ('documental.view', 'documental.create', 'documental.manage')
ON CONFLICT DO NOTHING;

COMMIT;
