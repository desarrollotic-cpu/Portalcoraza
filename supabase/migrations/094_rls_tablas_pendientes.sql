-- RLS en las tablas de negocio creadas despues de la migracion 041.
--
-- Supabase reporto `rls_disabled_in_public` el 17-10-2026. Causa: la 041 activo
-- RLS en todas las tablas de entonces con el ayudante `_mt_enable_rls` y lo
-- borro al final de si misma. Desde ahi, cada tabla nueva tenia que escribir su
-- politica a mano, y casi ninguna lo hizo.
--
-- Por que importa: `apps/web/src/environments/environment.prod.ts` publica la
-- URL del proyecto y la clave publicable dentro del paquete JS del portal. Eso
-- es correcto -- esa clave es publica por diseno -- pero entonces RLS es lo
-- unico que separa esas tablas de cualquiera que abra el portal. Sin RLS, la
-- API de datos de Supabase deja leer, modificar y borrar.
--
-- Comprobado antes de escribir esto: las nueve tablas tienen `tenant_id` y
-- CERO filas con `tenant_id` nulo, asi que activar RLS no oculta ningun dato.
--
-- NO cubre los catalogos globales (roles, permissions, role_permissions,
-- diagnosticos_cie10, organizations): la 041 los dejo fuera a proposito porque
-- se comparten entre tenants, y un filtro por tenant los romperia. Van aparte.

BEGIN;

DO $$
DECLARE
  t TEXT;
  huerfanas BIGINT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'doc_loan_mail_log',
    'post_contracts',
    'post_otrosi',
    'rondas_puntos',
    'rondas_marcaciones',
    'rondas_alertas',
    'radio_control_checks',
    'radio_control_roster',
    'radio_control_passes',
    'copropiedades'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'salto (no existe): %', t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
    ) THEN
      RAISE NOTICE 'salto (sin tenant_id): %', t;
      CONTINUE;
    END IF;

    -- Red de seguridad: una fila sin tenant quedaria invisible para la app.
    -- Antes que esconder datos, se salta la tabla y se avisa.
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id IS NULL', t) INTO huerfanas;
    IF huerfanas > 0 THEN
      RAISE NOTICE 'salto (% filas sin tenant_id): %', huerfanas, t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_select ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_write ON %I', t);

    -- Identica a la que la 041 creo para el resto de las tablas de negocio.
    EXECUTE format(
      'CREATE POLICY tenant_isolation_select ON %I
         FOR SELECT
         USING (
           NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
           AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
         )', t);

    EXECUTE format(
      'CREATE POLICY tenant_isolation_write ON %I
         FOR ALL
         USING (
           NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
           AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
         )
         WITH CHECK (
           NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL
           AND tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
         )', t);

    RAISE NOTICE 'RLS activado: %', t;
  END LOOP;
END $$;

COMMIT;
