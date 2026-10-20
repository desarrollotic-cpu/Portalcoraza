-- Los roles de cada cuadro pasan de un bloque JSONB a una tabla con llave real.
--
-- `monthly_schedules.personal` guardaba todo junto como JSONB: el rol, el
-- vigilante asignado, el turno y el rótulo. Eso tenía dos problemas:
--
--   1. Sin integridad referencial. Al dar de baja un vigilante, la base limpia
--      su id en `schedule_assignments` (ON DELETE SET NULL) pero no puede
--      tocarlo dentro del JSONB: quedaba un rol apuntando a alguien que ya no
--      existe.
--   2. No se puede consultar. Preguntas como «¿en qué puestos está este
--      vigilante?» o «¿qué puestos no tienen titular?» exigen recorrer el JSON
--      de todos los cuadros. Con 408 puestos eso no escala.
--
-- La columna `personal` NO se elimina aquí: queda marcada como obsoleta y sin
-- uso desde el código. Se retira en una migración posterior, una vez verificado
-- en producción.

BEGIN;

CREATE TABLE IF NOT EXISTS monthly_schedule_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL DEFAULT '11111111-1111-1111-1111-111111111111'
    REFERENCES organizations(id),
  schedule_id UUID NOT NULL REFERENCES monthly_schedules(id) ON DELETE CASCADE,
  -- Clave del rol: `titular_a`, `titular_b`, `relevante`, `relevante_2`,
  -- `ronda`, `ronda_2`, `turno_<n>`. De ella sale el tipo (ver motor-turnos).
  rol TEXT NOT NULL,
  -- Titular del rol en ese mes. Las celdas día a día viven en
  -- `schedule_assignments` y pueden tener a otra persona (un reemplazo).
  associate_id UUID REFERENCES associates(id) ON DELETE SET NULL,
  turno_id TEXT,
  -- Rótulo libre («Garita 2»). No decide el tipo de rol.
  display_name TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_monthly_schedule_role UNIQUE (schedule_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_monthly_schedule_roles_schedule
  ON monthly_schedule_roles (schedule_id);

-- Para «¿en qué puestos está este vigilante?», que antes era imposible.
CREATE INDEX IF NOT EXISTS idx_monthly_schedule_roles_associate
  ON monthly_schedule_roles (associate_id)
  WHERE associate_id IS NOT NULL;

DROP TRIGGER IF EXISTS monthly_schedule_roles_updated_at ON monthly_schedule_roles;
CREATE TRIGGER monthly_schedule_roles_updated_at
  BEFORE UPDATE ON monthly_schedule_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE monthly_schedule_roles IS
  'Roles del cuadro de un puesto en un mes (titular A/B, relevante, ronda) y el vigilante asignado a cada uno. Reemplaza monthly_schedules.personal.';

-- Copia lo que hubiera en el JSONB. Hoy la tabla está vacía, pero la migración
-- debe ser correcta si se aplica sobre un entorno que sí tenga cuadros.
INSERT INTO monthly_schedule_roles (tenant_id, schedule_id, rol, associate_id, turno_id, display_name, orden)
SELECT
  s.tenant_id,
  s.id,
  p.value->>'rol',
  NULLIF(p.value->>'associateId', '')::uuid,
  NULLIF(p.value->>'turnoId', ''),
  NULLIF(p.value->>'displayName', ''),
  (p.ordinality - 1)::int
FROM monthly_schedules s
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.personal, '[]'::jsonb)) WITH ORDINALITY AS p(value, ordinality)
WHERE NULLIF(p.value->>'rol', '') IS NOT NULL
ON CONFLICT (schedule_id, rol) DO NOTHING;

COMMENT ON COLUMN monthly_schedules.personal IS
  'OBSOLETA: los roles viven en monthly_schedule_roles desde la migración 093. Se conserva solo para respaldo; se elimina en una migración posterior.';

SELECT _mt_enable_rls('monthly_schedule_roles');

COMMIT;
