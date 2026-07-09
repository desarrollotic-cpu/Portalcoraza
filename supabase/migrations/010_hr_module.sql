-- ============================================================================
-- Portal Coraza — Migración 010: Módulo Gestión Humana (HRM v2)
-- ============================================================================
-- Basado en la lógica de negocio del repo pbc360252-a11y/GESTION-HUMANA-.
-- Reescribe el módulo RRHH con el modelo completo: 60+ campos por asociado,
-- catálogos maestros, cargos, centros de trabajo, retiros con encuesta,
-- documentos con vencimiento, alertas automáticas y auditoría campo-a-campo.
--
-- IMPORTANTE: esta migración es destructiva para los datos existentes de
-- `associates` y todas las tablas relacionadas (deliveries, shift_schedules,
-- schedule_assignments, associate_history). Se preservan los schemas de
-- esas tablas y sus FKs, solo se vacía la data mediante TRUNCATE CASCADE.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Cleanup: vaciar tablas dependientes de associates
-- ---------------------------------------------------------------------------
TRUNCATE associates RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- 2) Tipos ENUM del módulo HRM
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'associate_document_type') THEN
    CREATE TYPE associate_document_type AS ENUM ('CC', 'CE', 'PA', 'PEP');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'associate_sex_at_birth') THEN
    CREATE TYPE associate_sex_at_birth AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'associate_marital_status') THEN
    CREATE TYPE associate_marital_status AS ENUM ('SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'catalog_kind') THEN
    CREATE TYPE catalog_kind AS ENUM (
      'EPS', 'FONDO_PENSION', 'RH', 'GENERO', 'ORIENTACION_SEXUAL',
      'RELIGION', 'RAZA', 'MOTIVO_RETIRO', 'RAZON_RETIRO',
      'MEDIO_TRANSPORTE', 'TIEMPO_TRASLADO', 'TIPO_VIVIENDA',
      'NIVEL_ESTUDIO', 'RANGO_INGRESOS'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'associate_document_kind') THEN
    CREATE TYPE associate_document_kind AS ENUM (
      'CEDULA', 'CERTIFICADO_CURSO', 'EXAMEN_PSICOFISICO',
      'EXAMEN_PSICOSENSOMETRICO', 'POLIZA_SURA', 'CONTRATO',
      'ACTA', 'OTRO'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_alert_type') THEN
    CREATE TYPE hr_alert_type AS ENUM (
      'VENCIMIENTO_CURSO', 'VENCIMIENTO_PSICOFISICO',
      'VENCIMIENTO_PSICOSENSOMETRICO', 'VENCIMIENTO_POLIZA',
      'DOCUMENTO_FALTANTE'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_alert_status') THEN
    CREATE TYPE hr_alert_status AS ENUM ('PENDIENTE', 'RESUELTA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retirement_liquidation_status') THEN
    CREATE TYPE retirement_liquidation_status AS ENUM ('PENDIENTE', 'OK', 'EN_PROCESO', 'RECHAZADA');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retirement_would_return') THEN
    CREATE TYPE retirement_would_return AS ENUM ('SI', 'NO', 'N-A');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Tabla `job_positions` (Cargo) — puede ser crítico y tiene frecuencia
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL UNIQUE,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  refresh_frequency_years SMALLINT NOT NULL DEFAULT 2 CHECK (refresh_frequency_years IN (1, 2)),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER job_positions_updated_at BEFORE UPDATE ON job_positions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Tabla `work_centers` (CentroTrabajo) — cliente / lugar
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) NOT NULL UNIQUE,
  client_name VARCHAR(200) NOT NULL,
  address TEXT,
  zone VARCHAR(80),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER work_centers_updated_at BEFORE UPDATE ON work_centers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Tabla `catalog_values` (CatalogoValor) — catálogos maestros polimórficos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalog_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind catalog_kind NOT NULL,
  value VARCHAR(120) NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (kind, value)
);

CREATE INDEX IF NOT EXISTS idx_catalog_values_kind ON catalog_values(kind) WHERE is_active;

-- ---------------------------------------------------------------------------
-- 6) Reestructurar `associates` — quitar columnas viejas, agregar 60+ nuevas
-- ---------------------------------------------------------------------------

-- 6.1) Eliminar columnas viejas (schema plano)
ALTER TABLE associates
  DROP COLUMN IF EXISTS document_number,
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS eps,
  DROP COLUMN IF EXISTS arl,
  DROP COLUMN IF EXISTS afp,
  DROP COLUMN IF EXISTS bank,
  DROP COLUMN IF EXISTS blood_type,
  DROP COLUMN IF EXISTS hire_date;

-- 6.2) Añadir todas las columnas del modelo HRM (60+ campos)
ALTER TABLE associates
  -- Identidad
  ADD COLUMN IF NOT EXISTS folder_number INTEGER,                     -- numeroCarpetaActual
  ADD COLUMN IF NOT EXISTS act_reference VARCHAR(120),                -- acta
  ADD COLUMN IF NOT EXISTS document_type associate_document_type NOT NULL DEFAULT 'CC',
  ADD COLUMN IF NOT EXISTS document_number VARCHAR(30) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document_expedition_date DATE,
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS second_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS first_last_name VARCHAR(80) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS second_last_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS birth_date DATE NOT NULL DEFAULT '1900-01-01',
  ADD COLUMN IF NOT EXISTS sex_at_birth associate_sex_at_birth,
  ADD COLUMN IF NOT EXISTS marital_status associate_marital_status,

  -- Contacto
  ADD COLUMN IF NOT EXISTS email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS landline VARCHAR(30),
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(30) NOT NULL DEFAULT '',

  -- Contacto de emergencia
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(80),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30),

  -- Laboral y contrato
  ADD COLUMN IF NOT EXISTS hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES job_positions(id),
  ADD COLUMN IF NOT EXISTS work_center_id UUID REFERENCES work_centers(id),
  ADD COLUMN IF NOT EXISTS ordinary_compensation NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(80),

  -- Salud ocupacional / vigilancia
  ADD COLUMN IF NOT EXISTS psychophysical_valid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS psychosensometric_valid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS course_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS school_nit VARCHAR(50),
  ADD COLUMN IF NOT EXISTS course_certificate_number VARCHAR(80),
  ADD COLUMN IF NOT EXISTS has_sura_policy BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS funeral_service VARCHAR(120),

  -- Sociodemográfico
  ADD COLUMN IF NOT EXISTS children_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dependents_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estrato SMALLINT,
  ADD COLUMN IF NOT EXISTS life_plan TEXT,

  -- FKs a catálogos maestros
  ADD COLUMN IF NOT EXISTS eps_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS pension_fund_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS blood_type_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS gender_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS sexual_orientation_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS religion_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS race_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS housing_type_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS education_level_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS income_range_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS transport_mean_id UUID REFERENCES catalog_values(id),
  ADD COLUMN IF NOT EXISTS commute_time_id UUID REFERENCES catalog_values(id);

-- 6.3) Corregir defaults ficticios (limpieza post-agregar columnas)
ALTER TABLE associates
  ALTER COLUMN document_number DROP DEFAULT,
  ALTER COLUMN first_name DROP DEFAULT,
  ALTER COLUMN first_last_name DROP DEFAULT,
  ALTER COLUMN birth_date DROP DEFAULT,
  ALTER COLUMN mobile DROP DEFAULT,
  ALTER COLUMN hire_date DROP DEFAULT;

-- 6.4) Índices y unique de identificación
CREATE UNIQUE INDEX IF NOT EXISTS uidx_associates_document
  ON associates(document_number);
CREATE INDEX IF NOT EXISTS idx_associates_job_position
  ON associates(job_position_id);
CREATE INDEX IF NOT EXISTS idx_associates_work_center
  ON associates(work_center_id);
CREATE INDEX IF NOT EXISTS idx_associates_names
  ON associates(first_name, first_last_name);

-- ---------------------------------------------------------------------------
-- 7) Historial de cambios de cargo (position_history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS position_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  job_position_id UUID NOT NULL REFERENCES job_positions(id),
  work_center_id UUID REFERENCES work_centers(id),
  change_reason VARCHAR(200),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_history_associate
  ON position_history(associate_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- 8) Retiros de asociados (retirements)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS associate_retirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  retirement_date DATE NOT NULL,
  last_position VARCHAR(150) NOT NULL,
  age_at_retirement NUMERIC(5,2) NOT NULL,
  liquidation_status retirement_liquidation_status NOT NULL DEFAULT 'PENDIENTE',
  reason_id UUID NOT NULL REFERENCES catalog_values(id),       -- MOTIVO_RETIRO
  cause_id UUID NOT NULL REFERENCES catalog_values(id),        -- RAZON_RETIRO
  observations TEXT,
  least_liked TEXT,
  would_return retirement_would_return NOT NULL DEFAULT 'N-A',

  -- Encuesta de salida (1..5)
  survey_physical_env SMALLINT NOT NULL CHECK (survey_physical_env BETWEEN 1 AND 5),
  survey_induction SMALLINT NOT NULL CHECK (survey_induction BETWEEN 1 AND 5),
  survey_reinduction SMALLINT NOT NULL CHECK (survey_reinduction BETWEEN 1 AND 5),
  survey_training SMALLINT NOT NULL CHECK (survey_training BETWEEN 1 AND 5),
  survey_group_motivation SMALLINT NOT NULL CHECK (survey_group_motivation BETWEEN 1 AND 5),
  survey_recognition SMALLINT NOT NULL CHECK (survey_recognition BETWEEN 1 AND 5),
  survey_compensation SMALLINT NOT NULL CHECK (survey_compensation BETWEEN 1 AND 5),

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retirements_associate
  ON associate_retirements(associate_id, retirement_date DESC);
CREATE INDEX IF NOT EXISTS idx_retirements_reason
  ON associate_retirements(reason_id);
CREATE INDEX IF NOT EXISTS idx_retirements_date
  ON associate_retirements(retirement_date DESC);

CREATE TRIGGER associate_retirements_updated_at BEFORE UPDATE ON associate_retirements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 9) Documentos del asociado (associate_documents)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS associate_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  document_kind associate_document_kind NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(120),
  expiration_date DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_associate_documents_associate
  ON associate_documents(associate_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_associate_documents_kind
  ON associate_documents(associate_id, document_kind, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_associate_documents_expiration
  ON associate_documents(expiration_date) WHERE expiration_date IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 10) Alertas HRM automáticas (hr_alerts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hr_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  alert_type hr_alert_type NOT NULL,
  expiration_date DATE NOT NULL,
  status hr_alert_status NOT NULL DEFAULT 'PENDIENTE',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_alerts_associate
  ON hr_alerts(associate_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_alerts_status
  ON hr_alerts(status, expiration_date);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_hr_alerts_pending
  ON hr_alerts(associate_id, alert_type, expiration_date)
  WHERE status = 'PENDIENTE';

-- ---------------------------------------------------------------------------
-- 11) Enriquecer `associate_history` con campo de acción y campo modificado
-- ---------------------------------------------------------------------------
ALTER TABLE associate_history
  ADD COLUMN IF NOT EXISTS action VARCHAR(40) NOT NULL DEFAULT 'EDIT',
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- ---------------------------------------------------------------------------
-- 12) Vistas útiles: matriz de cumplimiento SST
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_hr_compliance_matrix AS
SELECT
  a.id AS associate_id,
  a.document_number,
  a.first_name || ' ' || a.first_last_name AS full_name,
  jp.name AS position_name,
  jp.is_critical,
  jp.refresh_frequency_years,
  a.psychophysical_valid,
  a.psychosensometric_valid,
  a.has_sura_policy,

  -- Último documento por tipo
  (
    SELECT d.expiration_date FROM associate_documents d
    WHERE d.associate_id = a.id AND d.document_kind = 'EXAMEN_PSICOFISICO'
    ORDER BY d.uploaded_at DESC LIMIT 1
  ) AS psychophysical_expires_at,
  (
    SELECT d.expiration_date FROM associate_documents d
    WHERE d.associate_id = a.id AND d.document_kind = 'EXAMEN_PSICOSENSOMETRICO'
    ORDER BY d.uploaded_at DESC LIMIT 1
  ) AS psychosensometric_expires_at,
  (
    SELECT d.expiration_date FROM associate_documents d
    WHERE d.associate_id = a.id AND d.document_kind = 'CERTIFICADO_CURSO'
    ORDER BY d.uploaded_at DESC LIMIT 1
  ) AS course_expires_at,
  (
    SELECT d.expiration_date FROM associate_documents d
    WHERE d.associate_id = a.id AND d.document_kind = 'POLIZA_SURA'
    ORDER BY d.uploaded_at DESC LIMIT 1
  ) AS sura_policy_expires_at
FROM associates a
LEFT JOIN job_positions jp ON jp.id = a.job_position_id
WHERE a.status = 'ACTIVO';

COMMIT;
