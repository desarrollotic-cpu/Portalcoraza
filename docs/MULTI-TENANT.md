# Multi-tenant (Semanas 1–4)

Ver diseño: `docs/superpowers/specs/2026-08-24-multi-tenant-design.md`  
Plan: `docs/superpowers/plans/2026-08-24-multi-tenant-foundation.md`

## Semana 1 — SQL

```powershell
npm run db:apply-multi-tenant -w @coraza/api
npm run db:apply-multi-tenant-default -w @coraza/api
npm run db:verify-multi-tenant -w @coraza/api
```

Tenant seed: `11111111-1111-1111-1111-111111111111` (Cooperativa Central).

## Semana 2 — Backend

- JWT incluye `tenantId`; login responde `user.tenantId`.
- `TenantInterceptor`: contexto + anti-spoof + **transacción** con `SET LOCAL ROLE coraza_app` y `app.tenant_id`.
- Parche TypeORM: filtra `where` y enruta queries al QueryRunner de la request (RLS).
- `TenantInsertSubscriber` rellena `tenantId` en INSERT.
- Entidades `Organization` + `Copropiedad` (sin CRUD).

## Semana 3 — Frontend

- Login guarda `coraza_tenant_id` en localStorage.
- `tenantInterceptor` envía header `X-Tenant-ID` (sin cambios de vistas).

## Semana 4 — RLS (Postgres)

Migración: `supabase/migrations/030_multi_tenant_rls.sql`

### Qué hace

1. Crea rol **`coraza_app`** (`NOSUPERUSER`, `NOBYPASSRLS`).
2. `GRANT` de DML sobre `public` a `coraza_app`.
3. En tablas de negocio con `tenant_id`:
   - `ENABLE ROW LEVEL SECURITY`
   - `FORCE ROW LEVEL SECURITY`
   - Políticas `tenant_isolation_select` / `tenant_isolation_write`  
     condición: `tenant_id = current_setting('app.tenant_id')::uuid`
4. **Sin RLS** en globales: `roles`, `permissions`, `role_permissions`, `diagnosticos_cie10`, `organizations`.

### Aplicar / verificar

```powershell
npm run db:apply-multi-tenant-rls -w @coraza/api
npm run db:verify-rls -w @coraza/api
npm run api:dev
npm run db:smoke-multi-tenant -w @coraza/api
```

`db:verify-rls` comprueba a nivel SQL (con `SET LOCAL ROLE coraza_app`) que tenant A no ve filas de tenant B y que sin `app.tenant_id` el resultado es vacío (fail-closed).

### Por qué `SET LOCAL ROLE`

En Supabase el usuario de conexión suele ser privilegiado y **bypassea RLS**. Dentro de cada request autenticada el interceptor hace `SET LOCAL ROLE coraza_app` + `set_config('app.tenant_id', …, true)` en la misma transacción que TypeORM, para que las políticas apliquen de verdad.
