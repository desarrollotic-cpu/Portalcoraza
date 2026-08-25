-- Módulo SST: Inspección de Puesto de Trabajo (IPT) y Seguimiento.

BEGIN;

DO $$ BEGIN
  CREATE TYPE sst_workplace_type AS ENUM (
    'PORTERIA', 'RECEPCION', 'PERIMETRO', 'CCTV', 'MOVIL', 'ALTURAS', 'OTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sst_inspection_type AS ENUM ('IPT_INICIAL', 'SEGUIMIENTO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sst_inspection_status AS ENUM ('BORRADOR', 'COMPLETADA', 'CERRADA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sst_valoracion AS ENUM ('SEGURO', 'RIESGOSO', 'N_A');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sst_plan_status AS ENUM ('ABIERTO', 'EN_PROCESO', 'CERRADO', 'REINCIDENTE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sst_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  nit TEXT,
  contacto TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sst_workplaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES sst_clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT NOT NULL DEFAULT 'Medellín',
  tipo_puesto sst_workplace_type NOT NULL DEFAULT 'OTRO',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_workplaces_client ON sst_workplaces(client_id);
CREATE INDEX IF NOT EXISTS idx_sst_workplaces_post ON sst_workplaces(post_id);

CREATE TABLE IF NOT EXISTS sst_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo INTEGER NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sst_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workplace_id UUID NOT NULL REFERENCES sst_workplaces(id) ON DELETE CASCADE,
  tipo sst_inspection_type NOT NULL DEFAULT 'IPT_INICIAL',
  inspeccion_anterior_id UUID REFERENCES sst_inspections(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  responsable_nombre TEXT NOT NULL,
  responsable_cargo TEXT NOT NULL DEFAULT 'Inspector SST',
  inspector_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  estado sst_inspection_status NOT NULL DEFAULT 'BORRADOR',
  observaciones_generales TEXT,
  cumplimiento_global NUMERIC(5,2),
  nivel_riesgo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_inspections_workplace ON sst_inspections(workplace_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_sst_inspections_estado ON sst_inspections(estado);

CREATE TABLE IF NOT EXISTS sst_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES sst_inspections(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES sst_checklist_items(id) ON DELETE RESTRICT,
  valoracion sst_valoracion,
  valoracion_anterior sst_valoracion,
  hallazgo TEXT,
  plan_accion_propuesto TEXT,
  responsable_plan_accion TEXT,
  fecha_compromiso DATE,
  estado_plan_accion sst_plan_status,
  reincidencia_count INTEGER NOT NULL DEFAULT 0,
  fecha_cierre DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sst_response UNIQUE (inspection_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_sst_responses_inspection ON sst_responses(inspection_id);
CREATE INDEX IF NOT EXISTS idx_sst_responses_plan ON sst_responses(estado_plan_accion, fecha_compromiso);

CREATE TABLE IF NOT EXISTS sst_evidences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES sst_responses(id) ON DELETE CASCADE,
  url_archivo TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sst_evidences_response ON sst_evidences(response_id);

DROP TRIGGER IF EXISTS sst_clients_updated_at ON sst_clients;
CREATE TRIGGER sst_clients_updated_at
  BEFORE UPDATE ON sst_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sst_workplaces_updated_at ON sst_workplaces;
CREATE TRIGGER sst_workplaces_updated_at
  BEFORE UPDATE ON sst_workplaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sst_inspections_updated_at ON sst_inspections;
CREATE TRIGGER sst_inspections_updated_at
  BEFORE UPDATE ON sst_inspections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS sst_responses_updated_at ON sst_responses;
CREATE TRIGGER sst_responses_updated_at
  BEFORE UPDATE ON sst_responses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Catálogo oficial 34 ítems
INSERT INTO sst_checklist_items (codigo, categoria, pregunta, sort_order) VALUES
  (1,  'Condiciones de seguridad', '¿Las vías se encuentran despejadas, libres de elementos que podrían causar caídas?', 1),
  (2,  'Condiciones de seguridad', '¿El suelo, andenes, calles, zonas de parqueo y espacio público están en buen estado?', 2),
  (3,  'Condiciones de seguridad', '¿Las conexiones eléctricas y tomacorrientes están en buen estado y protegidos/canalizados?', 3),
  (4,  'Condiciones de seguridad', '¿Las rutas de tránsito vehicular están separadas de las peatonales y señalizadas?', 4),
  (5,  'Condiciones de seguridad', '¿Hay espacio adecuado para paquetes/domicilios sin obstaculizar el paso?', 5),
  (6,  'Condiciones de seguridad', '¿Las escaleras tienen pasamanos firmemente asegurado?', 6),
  (7,  'Condiciones de seguridad', '¿Los escalones y rampas cuentan con cintas antideslizantes?', 7),
  (8,  'Condiciones de seguridad', '¿La huella de los escalones permite apoyo completo del pie?', 8),
  (9,  'Condiciones de seguridad', '¿Se cuenta con servicios sanitarios y zona de alimentación independientes?', 9),
  (10, 'Condiciones de seguridad', '¿Las armas de fuego están en buen estado y con mantenimiento periódico?', 10),
  (11, 'Condiciones de seguridad', '¿El personal tiene examen psicofísico para manejo de armas actualizado?', 11),
  (12, 'Condiciones de seguridad', '¿Se evidencian extintores señalizados, vigentes, accesibles y en buen estado?', 12),
  (13, 'Condiciones de seguridad', '¿Existe plan de emergencia, alarmas, señalización y el personal conoce el protocolo?', 13),
  (14, 'Condiciones de seguridad', '¿Se evidencia botiquín de primeros auxilios vigente, accesible y señalizado?', 14),
  (15, 'Condiciones de seguridad', '¿Se evidencia camilla de emergencias en el puesto de trabajo?', 15),
  (16, 'Biomecánicos', '¿Dispone de silla ergonómica en buen estado?', 16),
  (17, 'Biomecánicos', '¿Los implementos de trabajo están distribuidos adecuadamente?', 17),
  (18, 'Biomecánicos', '¿Se evidencia manipulación de cargas (halar, levantar, empujar)?', 18),
  (19, 'Biomecánicos', '¿Pueden alternar posturas de pie y sentado durante la jornada?', 19),
  (20, 'Biomecánicos', '¿Se evidencia movimiento repetitivo durante la jornada?', 20),
  (21, 'Biomecánicos', '¿Se evidencian movimientos inadecuados de tronco (flexión/giros)?', 21),
  (22, 'Biomecánicos', '¿Se hacen pausas activas o estiramientos en el puesto?', 22),
  (23, 'Químico', '¿Se evidencia derrame de líquidos, sólidos, polvo o escombros en zonas de tránsito?', 23),
  (24, 'Químico', '¿Las sustancias químicas están rotuladas y almacenadas apropiadamente?', 24),
  (25, 'Físico', '¿Existe buena iluminación en pasillos, portería, zonas comunes?', 25),
  (26, 'Físico', '¿Se evidencia exposición a ruido continuo durante la labor?', 26),
  (27, 'Biológico', '¿Está expuesto a riesgo biológico, fluidos, animales o insectos ponzoñosos?', 27),
  (28, 'Psicosocial', '¿Las tareas a realizar están en las consignas y han sido divulgadas?', 28),
  (29, 'Psicosocial', '¿El jefe inmediato maneja comunicación asertiva para consignas y novedades?', 29),
  (30, 'Psicosocial', '¿La tarea requiere altos niveles de concentración, atención y memoria?', 30),
  (31, 'Psicosocial', '¿Se evidencia exceso de confianza para ejecutar la labor?', 31),
  (32, 'Psicosocial', '¿Usan la dotación suministrada, acorde al entorno, y en buen estado?', 32),
  (33, 'Psicosocial', '¿Conocen el procedimiento de reporte de accidentes/incidentes/actos inseguros?', 33),
  (34, 'Otros', '¿Se identifican otros aspectos específicos del puesto no categorizados anteriormente?', 34)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO permissions (code, name, module) VALUES
  ('sst.view', 'Ver módulo SST / IPT', 'sst'),
  ('sst.inspect', 'Crear y editar inspecciones IPT', 'sst'),
  ('sst.manage', 'Gestionar clientes, puestos y catálogo SST', 'sst'),
  ('sst.alerts', 'Ver alertas críticas de reincidencia SST', 'sst')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles (code, name, description)
VALUES ('INSPECTOR_SST', 'Inspector SST', 'Inspecciones IPT y seguimiento de puestos de trabajo')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'INSPECTOR_SST'
  AND p.code IN ('sst.view', 'sst.inspect', 'sst.alerts')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('GERENCIA', 'ADMIN', 'SUPERADMIN')
  AND p.code IN ('sst.view', 'sst.inspect', 'sst.manage', 'sst.alerts')
ON CONFLICT DO NOTHING;

COMMIT;
