-- Ausentismo (paridad con GESTION-HUMANA)
-- Tablas: diagnosticos CIE-10 + registros de ausencias laborales

BEGIN;

CREATE TABLE IF NOT EXISTS diagnosticos_cie10 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_cie10_codigo ON diagnosticos_cie10 (codigo);

DO $$ BEGIN
  CREATE TYPE absenteeism_kind AS ENUM ('MEDICO', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE absenteeism_event_type AS ENUM ('D.A.', 'S.P.', 'L.R.', 'L.N.R.', 'ACT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS associate_absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  kind absenteeism_kind NOT NULL,
  event_type absenteeism_event_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  absence_days INTEGER NOT NULL CHECK (absence_days >= 0),
  days_in_month INTEGER NULL,
  is_extension BOOLEAN NOT NULL DEFAULT FALSE,
  post_incapacity_exam BOOLEAN NOT NULL DEFAULT FALSE,
  incapacity_origin VARCHAR(80) NULL,
  diagnosis_id UUID NULL REFERENCES diagnosticos_cie10(id) ON DELETE SET NULL,
  cause TEXT NULL,
  observations TEXT NULL,
  base_salary NUMERIC(14, 2) NULL,
  at_costs NUMERIC(14, 2) NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_absence_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_associate_absences_associate ON associate_absences (associate_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_associate_absences_kind ON associate_absences (kind, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_associate_absences_dates ON associate_absences (start_date, end_date);

DROP TRIGGER IF EXISTS associate_absences_updated_at ON associate_absences;
CREATE TRIGGER associate_absences_updated_at
  BEFORE UPDATE ON associate_absences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Permisos
INSERT INTO permissions (code, name, module) VALUES
  ('absences.view', 'Ver ausentismo', 'hr'),
  ('absences.create', 'Crear ausencias', 'hr'),
  ('absences.edit', 'Editar ausencias', 'hr'),
  ('absences.delete', 'Eliminar ausencias', 'hr'),
  ('absences.import', 'Importar ausentismo Excel', 'hr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('GERENCIA', 'RRHH') AND p.code IN (
  'absences.view', 'absences.create', 'absences.edit', 'absences.delete', 'absences.import'
)
ON CONFLICT DO NOTHING;

-- SST y Coordinador: solo consulta
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('SST', 'COORDINADOR_OPERATIVO') AND p.code = 'absences.view'
ON CONFLICT DO NOTHING;

-- Seed mínimo CIE-10 (el catálogo completo se importa desde Excel de la app de referencia)
INSERT INTO diagnosticos_cie10 (codigo, descripcion) VALUES
  ('J06X', 'INFECCIONES AGUDAS DE LAS VIAS RESPIRATORIAS SUPERIORES, SITIO NO ESPECIFICADO'),
  ('M545', 'LUMBAGO NO ESPECIFICADO'),
  ('A099', 'GASTROENTERITIS Y COLITIS DE ORIGEN INFECCIOSO, NO ESPECIFICADA'),
  ('S934', 'ESQUINCE Y TORCEDURA DEL TOBILLO'),
  ('Z000', 'EXAMEN MEDICO GENERAL'),
  ('O800', 'PARTO UNICO ESPONTANEO, PRESENTACION CEFALICA DE VERTICE'),
  ('F419', 'TRASTORNO DE ANSIEDAD, NO ESPECIFICADO'),
  ('K297', 'GASTRITIS, NO ESPECIFICADA')
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
