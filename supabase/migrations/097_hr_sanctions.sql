-- Sanciones disciplinarias: catálogo de numerales (reglamento interno) y sanciones por asociado.
--
-- Cada numeral define los días de sanción de la 1.ª, 2.ª, 3.ª y 4.ª vez. Al registrar
-- una sanción (eligiendo numeral y vez) el sistema calcula las fechas (inicio + días - 1),
-- pasa al asociado a SUSPENDIDO mientras dura y lo devuelve a su estado anterior al terminar.
-- Trae los 24 numerales del reglamento; Gestión Humana puede editarlos desde el portal.

BEGIN;

CREATE TABLE IF NOT EXISTS disciplinary_numerals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  numeral TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  -- Sanción según la vez: [1.ª, 2.ª, 3.ª, 4.ª]. N>0 = días de suspensión,
  -- 0 = llamada de atención por escrito, -1 = no aplica, -2 = sanción pecuniaria.
  dias_por_vez INT[] NOT NULL
    CHECK (cardinality(dias_por_vez) = 4 AND -2 <= ALL (dias_por_vez) AND 365 >= ALL (dias_por_vez)),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_disciplinary_numeral UNIQUE (tenant_id, numeral)
);

CREATE TABLE IF NOT EXISTS disciplinary_sanctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  associate_id UUID NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
  numeral_id UUID REFERENCES disciplinary_numerals(id) ON DELETE SET NULL,
  -- Copia del numeral al momento de sancionar: si el catálogo cambia, la sanción no.
  numeral TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  -- 1.ª a 4.ª vez que se sanciona por este numeral (la elige quien registra).
  ocurrencia INT NOT NULL DEFAULT 1 CHECK (ocurrencia BETWEEN 1 AND 4),
  tipo TEXT NOT NULL CHECK (tipo IN ('SUSPENSION', 'LLAMADO_ATENCION', 'PECUNIARIA')),
  dias INT NOT NULL DEFAULT 0 CHECK (dias >= 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'PROGRAMADA'
    CHECK (status IN ('PROGRAMADA', 'VIGENTE', 'CUMPLIDA', 'ANULADA')),
  -- Estado del asociado antes de suspenderlo, para devolverlo igual.
  previous_status TEXT,
  annul_reason TEXT,
  created_by UUID,
  annulled_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_sanction_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_sanctions_associate
  ON disciplinary_sanctions (associate_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_disciplinary_sanctions_open
  ON disciplinary_sanctions (status, start_date, end_date)
  WHERE status IN ('PROGRAMADA', 'VIGENTE');

DROP TRIGGER IF EXISTS disciplinary_numerals_updated_at ON disciplinary_numerals;
CREATE TRIGGER disciplinary_numerals_updated_at
  BEFORE UPDATE ON disciplinary_numerals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS disciplinary_sanctions_updated_at ON disciplinary_sanctions;
CREATE TRIGGER disciplinary_sanctions_updated_at
  BEFORE UPDATE ON disciplinary_sanctions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Aislamiento por tenant (política a mano, como en la 093).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['disciplinary_numerals', 'disciplinary_sanctions'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_write ON %I', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation_select ON %I FOR SELECT
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
    EXECUTE format($p$CREATE POLICY tenant_isolation_write ON %I FOR ALL
      USING (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (NULLIF(current_setting('app.tenant_id', true), '') IS NOT NULL
        AND tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)$p$, t);
  END LOOP;
END $$;

-- Escala de sanciones del reglamento interno (tenant por defecto).
INSERT INTO disciplinary_numerals (numeral, descripcion, dias_por_vez) VALUES
  ('1', 'No presentarse a laborar en el puesto de trabajo durante el turno asignado sin justa causa.', '{5,-1,-1,-1}'),
  ('2', 'Retardos injustificados de más de 15 minutos a los frentes de trabajo.', '{0,2,3,5}'),
  ('3', 'No cumplir con el manual de funciones de acuerdo al cargo que desempeña como trabajador asociado.', '{1,3,5,-1}'),
  ('4', 'No cumplir con las normas e instrucciones establecidas en las consignas generales y específicas determinadas por la cooperativa.', '{1,3,5,-1}'),
  ('5', 'No tener el puesto o frente de trabajo en condiciones óptimas para la prestación del servicio de vigilancia.', '{0,2,3,5}'),
  ('6', 'Cambio del puesto de trabajo por mal servicio según trazabilidad interna de la cooperativa.', '{1,3,5,-1}'),
  ('7', 'Por no hacer buen uso u operación de los medios de comunicación y elementos de dotación del puesto de trabajo.', '{1,3,5,-1}'),
  ('8', 'Por no portar o no hacer buen uso del uniforme asignado y los documentos requeridos para la prestación del servicio en forma integral y óptimas condiciones.', '{0,2,3,5}'),
  ('9', 'Por no cumplir con las políticas y disposiciones operativas adoptadas por la cooperativa.', '{1,3,5,-1}'),
  ('10', 'Por encontrarse dormido durante la prestación del servicio de vigilancia en la jornada de trabajo asignada.', '{3,5,-1,-1}'),
  ('11', 'Por no presentarse a citas programadas por la cooperativa para actividades sociales, operativas y administrativas.', '{0,1,3,5}'),
  ('12', 'Por no asistir a los exámenes psicofísicos, cursos de vigilancia, cursos de cooperativismo y cursos de formación programados por la cooperativa.', '{1,3,5,-1}'),
  ('13', 'Por no presentar oportunamente la documentación requerida en trámites ante autoridades competentes de control y entidades a las cuales estamos afiliados en materia de seguridad social integral y otras.', '{0,1,3,5}'),
  ('14', 'Por no actualizar y/o negarse en forma permanente y oportuna a suministrar: dirección de residencia, dirección de correo electrónico, teléfonos fijo y móvil, número de contacto de un pariente o familiar.', '{0,1,3,5}'),
  ('15', 'Cambiar de lugar, día de descanso, turno o jornada de trabajo asignada sin autorización o consentimiento de la Dirección Operativa o programación.', '{5,7,-1,-1}'),
  ('16', 'Realizar en el tiempo de trabajo otras labores o actividades económicas diferentes al trabajo asociado.', '{3,5,-1,-1}'),
  ('17', 'Quedarse luego de finalizar el turno de vigilancia en las instalaciones del cliente realizando actividades personales que pongan en riesgo las buenas relaciones comerciales entre las partes.', '{0,1,3,5}'),
  ('18', 'Utilizar el permiso solicitado para servicios de salud en otras actividades.', '{3,5,-1,-1}'),
  ('19', 'Por presentarse a la cooperativa o puesto de trabajo en horas laborales y no laborales en estado de embriaguez, tufo o bajo efecto de sustancias enervantes.', '{7,-1,-1,-1}'),
  ('20', 'Por manipular equipos, celulares personales, tablets, PC, TV, radios AM y FM, entre otros, haciendo uso de redes sociales que distraigan sus labores durante la prestación del servicio.', '{1,3,5,-1}'),
  ('21', 'Por abuso de confianza con los clientes y usuarios del servicio, realizando préstamos y obteniendo beneficios en forma personal sacando provecho del uniforme, estatus y servicio.', '{5,-1,-1,-1}'),
  ('22', 'Por comportamientos no idóneos en el puesto de trabajo que afecten las relaciones contractuales con los clientes del servicio.', '{5,-1,-1,-1}'),
  ('23', 'Todo daño que cometa el asociado a bienes, elementos y activos de propiedad de los usuarios y la cooperativa, conscientemente, por negligencia o descuido.', '{-2,-1,-1,-1}'),
  ('24', 'Por irrespetar a asociados, jefe inmediato, operativos, administrativos y superiores directivos de la cooperativa.', '{3,5,-1,-1}')
ON CONFLICT (tenant_id, numeral) DO NOTHING;

INSERT INTO permissions (code, name, module) VALUES
  ('sanctions.view', 'Ver sanciones disciplinarias', 'hr'),
  ('sanctions.create', 'Registrar y anular sanciones disciplinarias', 'hr'),
  ('sanctions.manage', 'Administrar numerales disciplinarios', 'hr')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('GERENCIA', 'RRHH')
  AND p.code IN ('sanctions.view', 'sanctions.create', 'sanctions.manage')
ON CONFLICT DO NOTHING;

COMMIT;
