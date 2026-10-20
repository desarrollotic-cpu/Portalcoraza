-- Cierra el acceso publico a los catalogos globales y a las dos tablas sin
-- tenant, sin tocar RLS.
--
-- Por que no RLS aqui: la 041 dejo fuera a proposito a roles, permissions,
-- role_permissions, diagnosticos_cie10 y organizations porque se comparten
-- entre tenants; el codigo tambien los excluye del filtro
-- (GLOBAL_TENANT_SKIP_TABLES en patch-typeorm-tenant.ts). Ademas el login corre
-- SIN contexto de tenant -- el interceptor sale temprano cuando no hay usuario
-- autenticado --, asi que una politica que exija `app.tenant_id` podria dejar a
-- todo el mundo fuera del portal.
--
-- Que hace en cambio: le quita el permiso a `anon` y `authenticated`, que son
-- los roles con los que entra la API de datos de Supabase usando la clave
-- publicable del portal. El API de NestJS se conecta como `postgres` por
-- conexion directa, asi que no se ve afectado.
--
-- `hr_legacy_users` y `minuta_folio_counter` van aqui y no en la 094 porque no
-- tienen columna `tenant_id`: no hay por donde filtrarlas.

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

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t);
    RAISE NOTICE 'acceso publico revocado: %', t;
  END LOOP;
END $$;

-- Que las tablas que se creen de aqui en adelante no nazcan abiertas.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

COMMIT;
