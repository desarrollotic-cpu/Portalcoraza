# Multi-tenant (Semana 1)

Ver diseño: `docs/superpowers/specs/2026-08-24-multi-tenant-design.md`  
Plan: `docs/superpowers/plans/2026-08-24-multi-tenant-foundation.md`

## Aplicar migración (después de backup)

```powershell
npm run db:apply-multi-tenant -w @coraza/api
npm run db:verify-multi-tenant -w @coraza/api
```

Tenant seed: `11111111-1111-1111-1111-111111111111` (Cooperativa Central).

Semanas 2–4: JWT, filtros Nest, interceptor Angular, RLS.
