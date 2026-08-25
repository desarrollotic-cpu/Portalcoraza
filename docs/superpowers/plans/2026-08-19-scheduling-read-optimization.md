# Scheduling read optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligerar lecturas de Programación por mes y estabilizar overviews bajo pool 5, sin cambios de UI.

**Architecture:** Slim `listByMonth` (sin `sin_asignar`, columnas mínimas); `overview` con SQL agregados; Dotación/Recepción/Documental analytics en serie.

**Tech Stack:** NestJS, TypeORM, Jest, demo-smoke.

## Global Constraints

- Sin cambio visual ni de contrato JSON de overviews.
- `getOne` / escritura de turnos intactos.
- Diff mínimo (Ponytail).

---

### Task 1: Overview Programación sin `listByMonth`

**Files:**
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.service.ts`
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.overview.spec.ts`

- [ ] Actualizar test para no depender de `listByMonth`
- [ ] Implementar agregaciones SQL en `overview`
- [ ] Correr spec overview

### Task 2: Slim `listByMonth`

**Files:**
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.service.ts`
- Modify: `apps/api/scripts/demo-smoke.ts` (mayo vía API)
- Modify: `docs/RENDIMIENTO.md`

- [ ] Query assignments selectivas + filtro `sin_asignar`
- [ ] Smoke mayo por API
- [ ] Actualizar nota en RENDIMIENTO

### Task 3: Overviews en serie

**Files:**
- Modify: `apps/api/src/modules/deliveries/deliveries.service.ts`
- Modify: `apps/api/src/modules/reception/reception.service.ts`
- Modify: `apps/api/src/modules/documental/services/overview.service.ts`

- [ ] Reemplazar `Promise.all` por awaits secuenciales en overview/dashboard/analytics
- [ ] Verificar smoke `test:demo`
