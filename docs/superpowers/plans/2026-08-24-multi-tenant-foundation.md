# Multi-tenant Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar Portal Coraza multi-tenant-ready (organizations + tenant_id + JWT/interceptor + RLS) en ≤4 semanas sin lógica de copropiedades.

**Architecture:** `organizations` es la raíz de tenant. Datos actuales se backfillean a “Cooperativa Central”. El JWT lleva `tenantId`; servicios filtran por él; Angular solo añade header. RLS en Semana 4 como red de seguridad.

**Tech Stack:** PostgreSQL/Supabase, NestJS 11 + TypeORM, Angular 21, JWT Passport.

## Global Constraints

- Opción A: `organizations` raíz; `copropiedades.organization_id` sin CRUD.
- No implementar visitantes/paquetería/reservas de negocio (solo tablas `cp_*`).
- No cambiar reglas de negocio de módulos existentes.
- Fuente de verdad: JWT `tenantId`, no el header solo.
- Migración segura: nullable → backfill → NOT NULL.
- Tenant seed UUID: `11111111-1111-1111-1111-111111111111`.

---

### Task 1: Spec + Semana 1 SQL (esta rama)

**Files:**
- Create: `docs/superpowers/specs/2026-08-24-multi-tenant-design.md`
- Create: `supabase/migrations/040_multi_tenant_foundation.sql`
- Create: `apps/api/scripts/apply-multi-tenant-foundation.ts`
- Create: `apps/api/scripts/verify-multi-tenant.ts`
- Modify: `apps/api/package.json` (scripts npm)

**Steps:**
- [x] Spec aprobado opción A
- [x] Migración 029 idempotente
- [x] Scripts apply + verify
- [x] Commit Semana 1 (aplicada en Supabase + DEFAULT 029b)

**Done when:** SQL y scripts en repo; verify script documentado.

---

### Task 2: Semana 2 — Auth + entidad Organization

**Files:**
- Create: `apps/api/src/modules/organizations/` (entity + module stub)
- Modify: `user.entity.ts`, `jwt-payload.interface.ts`, `auth.service.ts`, `jwt.strategy.ts`
- Create: `tenant.context.ts`, `tenant.guard` / interceptor
- Modify: servicios críticos (associates, posts, scheduling, reception, inventory, documental) para filtrar `tenantId`

**Done when:** Login/refresh incluyen `tenantId`; smoke API con filtro en posts/associates.

---

### Task 3: Semana 3 — Angular interceptor

**Files:**
- Modify: auth service / token storage
- Create: `tenant.interceptor.ts`
- Register in `app.config.ts` (o equivalente)

**Done when:** Tras login, `localStorage` tiene tenant; requests llevan `X-Tenant-ID`; sin cambios de vistas.

---

### Task 4: Semana 4 — RLS + tests + docs

**Files:**
- Create: `supabase/migrations/041_multi_tenant_rls.sql`
- Create: `apps/api/scripts/apply-multi-tenant-rls.ts`, `verify-rls.ts`
- Modify: `tenant.interceptor.ts` (QueryRunner + SET LOCAL ROLE)
- Update: `docs/MULTI-TENANT.md`

**Done when:** RLS activo en tablas de negocio; verify-rls A/B OK; globales sin RLS; smoke HTTP OK.

---

## Apply order (producción)

1. Backup Supabase
2. `npm run db:apply-multi-tenant -w @coraza/api`
3. `npm run db:verify-multi-tenant -w @coraza/api`
4. Deploy API (Semana 2+) then Web (Semana 3+)
