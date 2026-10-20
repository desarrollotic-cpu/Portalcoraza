-- Cierra el acceso publico a los catalogos globales y a las dos tablas sin
-- columna `tenant_id`.
--
-- Estas siete no pueden llevar la politica por tenant de la 094:
--   * roles, permissions, role_permissions, diagnosticos_cie10, organizations
--     se comparten entre tenants. La 041 las excluyo a proposito y el codigo
--     tambien (GLOBAL_TENANT_SKIP_TABLES en patch-typeorm-tenant.ts).
--   * hr_legacy_users y minuta_folio_counter no tienen `tenant_id`.
--
-- La politica de aqui no mira el tenant: exige unicamente que HAYA contexto de
-- tenant. Con eso cada identidad queda donde debe:
--
--   coraza_app  (peticiones autenticadas del API) -> el interceptor hace
--               SET LOCAL ROLE coraza_app y fija app.tenant_id -> PASA.
--   anon/authenticated (API de datos de Supabase, con la clave publicable del
--               portal) -> nunca fijan app.tenant_id -> BLOQUEADOS.
--   postgres    (login y migraciones) -> tiene BYPASSRLS, no le afecta. Se
--               comprueba solo: `users` ya tiene RLS desde la 041 y el login
--               la lee sin fijar contexto, asi que hoy ya se la salta.
--
-- Se revocan ademas los permisos de anon/authenticated (defensa en profundidad:
-- RLS y permisos son dos muros distintos) y se cierran los privilegios por
-- defecto para que las tablas futuras no nazcan abiertas.

BEGIN;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles',
    'permissions',
    'role_permissions',
    'diagnosticos_cie10',
    'organizations',
    'hr_legacy_users',
    'minuta_folio_counter'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'salto (no existe): %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS catalogo_requiere_contexto ON %I', t);

    -- Sin filtro por tenant: solo exige que la sesion tenga contexto.
    EXECUTE format(
      'CREATE POLICY catalogo_requiere_contexto ON %I
         FOR ALL
         USING (NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL)
         WITH CHECK (NULLIF(current_setting(''app.tenant_id'', true), '''') IS NOT NULL)', t);

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);

    RAISE NOTICE 'cerrado al publico: %', t;
  END LOOP;
END $$;

-- Que las tablas que se creen de aqui en adelante no nazcan abiertas.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

COMMIT;
