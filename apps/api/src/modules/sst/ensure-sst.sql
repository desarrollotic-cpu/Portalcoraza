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

-- Catálogo oficial 34 ítems (texto exacto del Formato IPT y seguimiento)
INSERT INTO sst_checklist_items (codigo, categoria, pregunta, sort_order) VALUES
  (1,  'Condiciones de seguridad', '¿Las vías se encuentran despejadas, libres de elementos que podrían causar caídas (hojas, pasto, barro, fierros, cajas, madera, grasas, aceites, etc.)?', 1),
  (2,  'Condiciones de seguridad', '¿El suelo, los andenes, las calles, zonas de parqueo, y el espacio público por donde deben transitar por la labor realizada se encuentran en buen estado (Sin desniveles, huecos, baldosas sueltas o levantadas)?', 2),
  (3,  'Condiciones de seguridad', '¿Las conexiones eléctricas y tomas corriente se encuentran en buen estado y protegidos o canalizados?', 3),
  (4,  'Condiciones de seguridad', '¿Las rutas de tránsito vehicular están separadas a las rutas de tránsito peatonal y se encuentran señalizadas?', 4),
  (5,  'Condiciones de seguridad', '¿Se evidencia un espacio adecuado para disponer los paquetes y domicilios y que no obstaculicen el paso?', 5),
  (6,  'Condiciones de seguridad', '¿Las escaleras por donde transita tienen pasamanos? ¿Y están firmemente asegurado?', 6),
  (7,  'Condiciones de seguridad', '¿Los escalones de las escaleras y las rampas cuentan con cintas antideslizantes?', 7),
  (8,  'Condiciones de seguridad', '¿La huella de los escalones permiten que el pie quede completamente apoyado?', 8),
  (9,  'Condiciones de seguridad', '¿Se cuenta con servicios sanitarios y zona de alimentación independientes?', 9),
  (10, 'Condiciones de seguridad', '¿Las armas de fuego están en buen estado y se les realiza mantenimiento periódico? ¿Cuándo fue el último mantenimiento?', 10),
  (11, 'Condiciones de seguridad', '¿El personal cuenta con el examen psicofísico para el manejo de armas y está actualizado?', 11),
  (12, 'Condiciones de seguridad', '¿Se evidencia extintores u otros medios de lucha contra el fuego, señalizados, vigentes, de fácil acceso y en buen estado?', 12),
  (13, 'Condiciones de seguridad', '¿Existe plan de emergencia, alarmas, altavoces, señalización de emergencia, punto de encuentro u otros dispositivos de notificación de una emergencia y el personal tiene claridad de cómo actuar frente a una emergencia según los protocolos de la empresa cliente?', 13),
  (14, 'Condiciones de seguridad', '¿Se evidencia botiquín de primeros auxilios con insumos vigentes, de fácil acceso y señalizado?', 14),
  (15, 'Condiciones de seguridad', '¿Se evidencia camilla de emergencias en el puesto de trabajo?', 15),
  (16, 'Biomecánicos', '¿Dispone el puesto de una silla ergonómica en buen estado que le permita al trabajador mantener una postura cómoda?', 16),
  (17, 'Biomecánicos', '¿Se encuentran los implementos de trabajo distribuidos adecuadamente (computadores, pantallas de monitoreo, teléfono, citófonos, botonera, etc.)?', 17),
  (18, 'Biomecánicos', '¿Se evidencia manipulación de cargas (halar, levantar, y/o empujar)?', 18),
  (19, 'Biomecánicos', '¿Los vigilantes pueden alternar posturas de pie y sentado durante la jornada laboral?', 19),
  (20, 'Biomecánicos', '¿Se evidencia movimiento repetitivo (Digitar, escribir, hundir botones, contestar teléfonos) durante la jornada laboral?', 20),
  (21, 'Biomecánicos', '¿Se evidencia la realización de movimientos inadecuados de tronco (flexión y giros de tronco)?', 21),
  (22, 'Biomecánicos', '¿Se hacen pausas activas o estiramientos en el puesto de trabajo?', 22),
  (23, 'Químico', '¿Se evidencia derrame de líquidos, sólidos, polvo, escombros u otros, en las áreas de desplazamiento?', 23),
  (24, 'Químico', '¿Las sustancias químicas se encuentran rotuladas, almacenadas en sitios apropiados? (Identificar cuáles son las sustancias químicas a las que se encuentra expuesto el vigilante)', 24),
  (25, 'Físico', '¿Existe buena iluminación en pasillos, portería, zonas comunes, y demás áreas de circulación?', 25),
  (26, 'Físico', '¿Se evidencia exposición a ruido continuo mientras realiza la labor?', 26),
  (27, 'Biológico', '¿Al realizar el control perimetral y/o en las porterías está expuesto a riesgo biológico, fluidos corporales, animales o insectos ponzoñosos o callejeros?', 27),
  (28, 'Psicosocial', '¿Todas las tareas a realizar, se encuentran en las consignas y han sido divulgadas?', 28),
  (29, 'Psicosocial', '¿El jefe inmediato maneja una comunicación asertiva para informar consignas y novedades?', 29),
  (30, 'Psicosocial', '¿La tarea requiere de altos niveles de concentración, atención sostenida y memoria?', 30),
  (31, 'Psicosocial', '¿Se evidencia exceso de confianza para ejecutar la labor?', 31),
  (32, 'Psicosocial', '¿Los vigilantes hacen uso de la dotación suministrada por la cooperativa, y según las condiciones del entorno y/o la actividad a realizar y se encuentran en buen estado? (Botas de seguridad, carpa, botas pantaneras, goliana, linterna y sombrilla, entre otros)', 32),
  (33, 'Psicosocial', '¿Los empleados conocen el procedimiento para el reporte de accidentes e incidentes, condiciones y actos inseguros?', 33),
  (34, 'Otros', 'OTROS (incorpore otros riesgos que pueda observar)', 34)
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
