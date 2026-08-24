# Multi-tenant (Semana 1–3)

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
- `TenantInterceptor` fija `TenantContext` y rechaza `X-Tenant-ID` distinto del JWT.
- Parche TypeORM: `find`/`findOne`/… filtran por `tenantId` si hay contexto.
- `TenantInsertSubscriber` rellena `tenantId` en INSERT.
- Entidades `Organization` + `Copropiedad` (sin CRUD).

## Semana 3 — Frontend

- Login guarda `coraza_tenant_id` en localStorage.
- `tenantInterceptor` envía header `X-Tenant-ID` (sin cambios de vistas).

## Verificación local (2 tenants)

```powershell
npm run api:dev
npm test -w @coraza/api -- --testPathPattern="tenant\\.(context|interceptor)|patch-typeorm-tenant"
npm run db:smoke-multi-tenant -w @coraza/api
```

Comprueba: denylist globales, anti-spoof 403, create con `tenantId` del JWT, aislamiento posts A/B.

## Semana 4 — RLS + tests aislamiento (siguiente)

Políticas Postgres RLS como red de seguridad adicional.