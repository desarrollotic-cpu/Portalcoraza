# Minuta Virtual — App separada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer Minuta Virtual a `apps/minuta-web` (frontend propio), vigilantes por URL aparte, operaciones/gerencia siguen en Portal Coraza, misma API y DB.

**Architecture:** Nuevo workspace Angular en el monorepo; migrar UI desde `apps/web/features/minuta`; Portal conserva operaciones/minutas; auth JWT compartido; segundo deploy Render.

**Tech Stack:** Angular 19+, NestJS API existente, npm workspaces, Render static sites.

## Global Constraints

- Reutilizar API `apps/api` — **no** duplicar módulo minuta.
- Rol `PUESTO`: solo app Minuta; redirect post-login fuera del portal.
- Operaciones: `/operaciones/minutas` permanece en `apps/web`.
- Multi-tenant: sin cambios DB; `tenant_id` ya en tablas.
- Commits por fase; merge a `main` solo cuando lo pida JHON.
- No tocar paleta login portal sin aprobación.

---

## Fase 1 — Scaffold `apps/minuta-web`

### Task 1.1: Crear workspace

**Files:**
- Create: `apps/minuta-web/` (Angular app, nombre `@coraza/minuta-web`)
- Modify: root `package.json` — scripts `minuta:dev`, `minuta:build`

**Steps:**
- [ ] Generar app Angular alineada con versión de `apps/web` (standalone, SCSS, routing)
- [ ] Registrar workspace en npm
- [ ] `environment.ts` con `apiUrl` igual patrón que web
- [ ] Verificar `npm run minuta:build` compila

**Commit:** `chore(minuta-web): scaffold workspace Angular`

---

## Fase 2 — Auth mínimo

### Task 2.1: Login + sesión

**Files:**
- Create: `apps/minuta-web/src/app/core/services/auth.service.ts` (adaptar de web, solo lo necesario)
- Create: `apps/minuta-web/src/app/core/interceptors/auth.interceptor.ts`
- Create: `apps/minuta-web/src/app/features/auth/login/login.ts`
- Create: `apps/minuta-web/src/app/core/guards/auth.guard.ts`

**Steps:**
- [ ] Pantalla login corporativa simple (no copiar video portal)
- [ ] Tras login OK → `/` (dashboard minuta)
- [ ] Guard: sin token → `/login`
- [ ] Probar contra API local `POST /auth/login` con usuario PUESTO

**Commit:** `feat(minuta-web): login y sesion JWT`

---

## Fase 3 — Migrar UI Minuta

### Task 3.1: Mover features

**Files:**
- Move/adapt: `minuta-inicio`, `minuta-nuevo`, `minuta-historial`, `minuta-detalle-dialog`, `minuta.shared.ts`, `minuta-api.service.ts`
- Create: `apps/minuta-web/src/app/layout/minuta-shell.ts` (reemplaza `module-shell` + portal chrome)
- Create: `apps/minuta-web/src/app/app.routes.ts`

**Steps:**
- [ ] Rutas: `''` inicio, `nuevo`, `historial`
- [ ] Shell: header Minuta + nav 3 tabs (sin sidebar portal)
- [ ] Ajustar imports (`environment`, paths shared)
- [ ] Copiar estilos mínimos / variables si hace falta

**Commit:** `feat(minuta-web): migrar pantallas minuta desde portal`

---

## Fase 4 — Portal: desacoplar vigilantes

### Task 4.1: Redirect PUESTO

**Files:**
- Modify: `apps/web/src/app/core/services/auth.service.ts` — `getDefaultRoute()`
- Modify: `apps/web/src/app/core/guards/auth.guard.ts` o login component — si `PUESTO` → `window.location` a `MINUTA_WEB_URL`
- Modify: `apps/web/src/environments/environment*.ts` — `minutaWebUrl`

**Steps:**
- [ ] `PUESTO` nunca aterriza en `/dashboard` ni `/minutas` del portal
- [ ] Cuentas sin permiso portal → mensaje claro con link Minuta

**Commit:** `fix(web): redirect rol PUESTO a app Minuta`

### Task 4.2: Menú lateral

**Files:**
- Modify: `apps/web/src/app/layouts/main-layout/main-layout.ts`

**Steps:**
- [ ] Ocultar ítem "Minuta Virtual" si rol es `PUESTO`
- [ ] Opcional: ocultar para todos y dejar consulta solo en Operaciones (confirmar con JHON en PR)

**Commit:** `fix(web): ajustar nav minuta en portal`

### Task 4.3: Eliminar rutas minuta del portal (opcional v1.1)

**Files:**
- Modify: `apps/web/src/app/app.routes.ts` — comentar/eliminar bloque `/minutas` hijo de main-layout
- Delete: `apps/web/src/app/features/minuta/` (solo tras migración verificada)

**Steps:**
- [ ] Verificar operaciones/minutas-list sigue funcionando (usa API directa, no features/minuta)

**Commit:** `refactor(web): retirar modulo minuta del portal`

---

## Fase 5 — Deploy

### Task 5.1: Build + SPA fallbacks

**Files:**
- Create: `apps/minuta-web/scripts/spa-fallback-pages.js` (copiar patrón web)
- Modify: Render dashboard / `render.yaml` si existe — segundo static site

**Steps:**
- [ ] `minuta:build` genera `dist/minuta-web`
- [ ] Fallbacks: `/login`, `/nuevo`, `/historial`
- [ ] Documentar en README o AGENTS.md scripts `minuta:dev`

**Commit:** `chore(minuta-web): build y spa fallbacks`

### Task 5.2: CORS producción

**Files:**
- Modify: Render env `CORS_ORIGIN` en servicio API

**Steps:**
- [ ] Añadir URL Minuta prod (y localhost:4201 si puerto distinto en dev)
- [ ] Smoke: login minuta-web → GET `/minuta/dashboard` 200

**Commit:** `chore(api): CORS origen minuta-web`

---

## Verificación

- [ ] `npm run test -w @coraza/api` — specs minuta siguen verdes
- [ ] `npm run web:build` OK
- [ ] `npm run minuta:build` OK
- [ ] Manual: PUESTO en minuta-web crea visitante; Operaciones ve en historial/PDF
- [ ] Manual: PUESTO no accede menú portal (redirect)

## Estimación

| Fase | Días (aprox.) |
|------|----------------|
| 1 Scaffold | 0.5–1 |
| 2 Auth | 1 |
| 3 Migrar UI | 2–3 |
| 4 Portal | 1 |
| 5 Deploy | 0.5–1 |
| **Total** | **5–7 días** |
