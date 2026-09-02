-- Migración 043: Sincronización automática de Puestos de Coraza (Operaciones / Recepción / Programación) con SST.

BEGIN;

-- 1. Sincronizar clientes basados en client_name de la tabla posts
INSERT INTO sst_clients (nombre, nit, contacto, tenant_id)
SELECT DISTINCT
  COALESCE(NULLIF(TRIM(p.client_name), ''), TRIM(p.name), 'Coraza Seguridad C.T.A.') AS nombre,
  'N/A' AS nit,
  COALESCE(NULLIF(TRIM(p.contact_name), ''), 'Operaciones') AS contacto,
  COALESCE(p.tenant_id, '11111111-1111-1111-1111-111111111111'::uuid) AS tenant_id
FROM posts p
WHERE NOT EXISTS (
  SELECT 1 FROM sst_clients sc
  WHERE LOWER(TRIM(sc.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(p.client_name), ''), TRIM(p.name), 'Coraza Seguridad C.T.A.')))
    AND sc.tenant_id = COALESCE(p.tenant_id, '11111111-1111-1111-1111-111111111111'::uuid)
);

-- 2. Sincronizar puestos existentes
INSERT INTO sst_workplaces (client_id, post_id, nombre, direccion, ciudad, tipo_puesto, activo, tenant_id)
SELECT
  sc.id AS client_id,
  p.id AS post_id,
  TRIM(p.name) AS nombre,
  p.address AS direccion,
  COALESCE(NULLIF(TRIM(p.zone), ''), 'Medellín') AS ciudad,
  CASE
    WHEN p.type = 'UNIDAD_RESIDENCIAL' THEN 'PORTERIA'::sst_workplace_type
    WHEN p.type = 'HOSPITAL' THEN 'RECEPCION'::sst_workplace_type
    WHEN p.type = 'OBRA' THEN 'PERIMETRO'::sst_workplace_type
    WHEN p.type = 'UNIVERSIDAD' THEN 'RECEPCION'::sst_workplace_type
    ELSE 'OTRO'::sst_workplace_type
  END AS tipo_puesto,
  (p.status = 'ACTIVO') AS activo,
  COALESCE(p.tenant_id, '11111111-1111-1111-1111-111111111111'::uuid) AS tenant_id
FROM posts p
JOIN sst_clients sc ON LOWER(TRIM(sc.nombre)) = LOWER(TRIM(COALESCE(NULLIF(TRIM(p.client_name), ''), TRIM(p.name), 'Coraza Seguridad C.T.A.')))
  AND sc.tenant_id = COALESCE(p.tenant_id, '11111111-1111-1111-1111-111111111111'::uuid)
WHERE NOT EXISTS (
  SELECT 1 FROM sst_workplaces sw WHERE sw.post_id = p.id
);

-- 3. Trigger en tiempo real: cualquier puesto nuevo o editado en posts (Recepción / Operaciones) se sincroniza en SST
CREATE OR REPLACE FUNCTION fn_sync_post_to_sst()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
  v_client_name TEXT;
  v_tenant_id UUID;
  v_tipo sst_workplace_type;
BEGIN
  v_tenant_id := COALESCE(NEW.tenant_id, '11111111-1111-1111-1111-111111111111'::uuid);
  v_client_name := COALESCE(NULLIF(TRIM(NEW.client_name), ''), TRIM(NEW.name), 'Coraza Seguridad C.T.A.');

  SELECT id INTO v_client_id
  FROM sst_clients
  WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(v_client_name))
    AND tenant_id = v_tenant_id
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO sst_clients (nombre, nit, contacto, tenant_id)
    VALUES (v_client_name, 'N/A', COALESCE(NULLIF(TRIM(NEW.contact_name), ''), 'Operaciones'), v_tenant_id)
    RETURNING id INTO v_client_id;
  END IF;

  CASE NEW.type
    WHEN 'UNIDAD_RESIDENCIAL' THEN v_tipo := 'PORTERIA'::sst_workplace_type;
    WHEN 'HOSPITAL' THEN v_tipo := 'RECEPCION'::sst_workplace_type;
    WHEN 'OBRA' THEN v_tipo := 'PERIMETRO'::sst_workplace_type;
    WHEN 'UNIVERSIDAD' THEN v_tipo := 'RECEPCION'::sst_workplace_type;
    ELSE v_tipo := 'OTRO'::sst_workplace_type;
  END CASE;

  IF EXISTS (SELECT 1 FROM sst_workplaces WHERE post_id = NEW.id) THEN
    UPDATE sst_workplaces
    SET
      client_id = v_client_id,
      nombre = TRIM(NEW.name),
      direccion = NEW.address,
      ciudad = COALESCE(NULLIF(TRIM(NEW.zone), ''), ciudad, 'Medellín'),
      tipo_puesto = v_tipo,
      activo = (NEW.status = 'ACTIVO'),
      updated_at = NOW()
    WHERE post_id = NEW.id;
  ELSE
    INSERT INTO sst_workplaces (client_id, post_id, nombre, direccion, ciudad, tipo_puesto, activo, tenant_id)
    VALUES (
      v_client_id,
      NEW.id,
      TRIM(NEW.name),
      NEW.address,
      COALESCE(NULLIF(TRIM(NEW.zone), ''), 'Medellín'),
      v_tipo,
      (NEW.status = 'ACTIVO'),
      v_tenant_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_sync_to_sst ON posts;
CREATE TRIGGER trg_posts_sync_to_sst
  AFTER INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_post_to_sst();

COMMIT;
