-- Monthly scheduling (programación mensual por puesto)
-- Modelo: 1 programación por puesto y mes; filas = roles/turnos, columnas = días.
-- month se almacena 1-12 (enero = 1).

CREATE TYPE schedule_status AS ENUM ('borrador', 'publicado', 'anulado');

-- Cabecera: una fila por puesto/mes
CREATE TABLE IF NOT EXISTS monthly_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status schedule_status NOT NULL DEFAULT 'borrador',
  -- personal: JSONB array de { rol, associateId, turnoId, displayName }
  personal JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_monthly_schedule UNIQUE (post_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_schedules_month ON monthly_schedules(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_schedules_post ON monthly_schedules(post_id);

-- Celdas: una fila por (programación, día, rol)
CREATE TABLE IF NOT EXISTS schedule_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES monthly_schedules(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  role TEXT NOT NULL,
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  turno TEXT CHECK (turno IN ('AM', 'PM', '24H')),
  jornada TEXT NOT NULL DEFAULT 'sin_asignar' CHECK (
    jornada IN (
      'normal',
      'descanso_remunerado',
      'descanso_no_remunerado',
      'vacacion',
      'licencia',
      'suspension',
      'incapacidad',
      'accidente',
      'sin_asignar'
    )
  ),
  -- codigo visible en la celda: D, N, DR, NR, VAC, LC, SP, IN, AC
  codigo TEXT,
  inicio TEXT,
  fin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_schedule_assignment UNIQUE (schedule_id, day, role)
);

CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_associate ON schedule_assignments(associate_id);

-- Plantillas de programación (patrón reutilizable)
CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  personal JSONB NOT NULL DEFAULT '[]'::jsonb,
  patron JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER monthly_schedules_updated_at BEFORE UPDATE ON monthly_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER schedule_assignments_updated_at BEFORE UPDATE ON schedule_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
