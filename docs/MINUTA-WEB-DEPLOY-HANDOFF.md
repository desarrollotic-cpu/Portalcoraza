# Minuta Web — Handoff de despliegue (28 ago 2026)

Documento para retomar el deploy paso a paso. Estado al cierre del día.

---

## Qué es Minuta Web

Frontend **separado** del Portal Coraza para vigilantes en puesto (rol `PUESTO`).

| App | URL producción | Usuarios |
|-----|----------------|----------|
| **Portal Coraza** | https://portalcoraza-web.onrender.com | Admin, operaciones, gerencia, etc. |
| **Minuta Virtual** | https://portalcoraza-minuta.onrender.com | Vigilantes (`PUESTO`) |
| **API** (compartida) | https://portalcoraza.onrender.com/api/v1 | Ambas apps |

- Misma base de datos y misma API NestJS (`apps/api`).
- Operaciones/gerencia siguen viendo reportes de minuta en Portal → `/operaciones/minutas`.
- Vigilantes **no** entran al menú del portal; se redirigen a Minuta Web.

---

## Estado actual (dónde paramos — 29 ago 2026)

### ✅ Hecho

| # | Item | Detalle |
|---|------|---------|
| 1 | Código `apps/minuta-web` | Angular 21, puerto dev `4201`, rutas hash (`#/login`, `#/nuevo`, `#/historial`) |
| 2 | Portal redirige `PUESTO` | `apps/web` → `environment.minutaWebUrl` |
| 3 | Push a `main` | Commits en GitHub |
| 4 | Static site Render | Servicio **`portalcoraza-minuta`** deploy en verde |
| 5 | URL responde | https://portalcoraza-minuta.onrender.com → **200** |
| 6 | `render.yaml` | Segundo static site documentado |
| 7 | **`CORS_ORIGIN` en API** | Incluye portal + minuta; preflight OPTIONS verificado (`access-control-allow-origin` OK); API redesplegada |

**Commits relevantes en `main`:**

```
4780795 chore(deploy): static site minuta-web en render.yaml y CORS dev 4201
1bdf023 fix(web): redirigir rol PUESTO a minuta-web y ocultar nav minuta en portal
036c10e feat(minuta-web): app Angular separada para vigilantes en puesto
```

### ⏸ Pendiente — retomar **próxima semana** (smoke test)

| # | Item | Quién |
|---|------|-------|
| 1 | Smoke test 1: login PUESTO en Minuta | JHON + agente |
| 2 | Smoke test 2: redirect Portal → Minuta (mismo PUESTO) | JHON + agente |
| 3 | Smoke test 3: admin/ops sigue en Portal + minutas ops | JHON + agente |
| 4 | (Si falta) Usuario PUESTO de prueba | JHON |

> **Nota 29 ago:** se pausó antes de completar el Test 1 en navegador. CORS ya está listo; no hace falta volver a tocar Environment salvo que alguien lo sobrescriba.

---

## CORS — ya aplicado (referencia)

Valor esperado en API `portalcoraza` → Environment → `CORS_ORIGIN`:

```
https://portalcoraza-web.onrender.com,https://portalcoraza-minuta.onrender.com
```

---

## Smoke test (3 puntos) — checklist próxima semana

### Test 1 — Minuta directa

1. Abrir https://portalcoraza-minuta.onrender.com
2. Login con usuario rol **PUESTO**
3. Debe entrar a inicio (`/#/`)

### Test 2 — Redirect desde Portal

1. Ventana privada: https://portalcoraza-web.onrender.com
2. Login con el **mismo** usuario PUESTO
3. Debe ir a `https://portalcoraza-minuta.onrender.com` (no dashboard portal)

### Test 3 — Operaciones intactas

1. Login admin/operaciones en portal
2. Debe quedarse en portal
3. Operaciones → minutas / historial OK

---

## Redirects/Rewrites en Render — NO obligatorio para Minuta

Minuta Web usa **`withHashLocation()`** (rutas con `#`). Solo necesita que `/` sirva `index.html`; el static site ya lo hace.

| App | Routing | ¿Rewrite `/*` → `/index.html`? |
|-----|---------|--------------------------------|
| Minuta Web | Hash `#/login` | **No** |
| Portal Web | Hash `#/auth/login` | **No** (igual criterio) |

Si no encuentras **Redirects/Rewrites** en el dashboard, **no es bloqueante** para Minuta.

---

## Config Render — Static site Minuta (referencia)

Por si hay que recrear el servicio:

| Campo | Valor |
|-------|--------|
| Name | `portalcoraza-minuta` |
| Branch | `main` |
| Build Command | `npm install && npm run minuta:build` |
| Publish Directory | `apps/minuta-web/dist/minuta-web/browser` |
| Variables | Ninguna obligatoria (opcional `NODE_VERSION=20`) |

URLs embebidas en build (`apps/minuta-web/src/environments/environment.prod.ts`):

- API: `https://portalcoraza.onrender.com/api/v1`
- Portal: `https://portalcoraza-web.onrender.com`

---

## Desarrollo local

```bash
# Terminal 1 — API
npm run api:dev

# Terminal 2 — Minuta
npm run minuta:dev
# → http://localhost:4201

# Terminal 3 (opcional) — Portal
npm run web:dev
# → http://localhost:4200
```

Build producción:

```bash
npm run minuta:build
npm run web:build
```

---

## Qué decirle al agente la próxima semana

Copia y pega:

> **Recomendada:**  
> «Seguimos desde `docs/MINUTA-WEB-DEPLOY-HANDOFF.md`. CORS listo. Smoke test de 3 puntos paso a paso.»

> **Corta:**  
> «Smoke test Minuta Web — Test 1 login PUESTO.»

---

## Docs relacionados

| Archivo | Contenido |
|---------|-----------|
| `docs/superpowers/specs/2026-08-28-minuta-app-separada-design.md` | Diseño / decisiones |
| `docs/superpowers/plans/2026-08-28-minuta-app-separada.md` | Plan de implementación por fases |
| `docs/DEPLOY-RENDER.md` | Deploy general Portal + API |
| `render.yaml` | Blueprint con `portalcoraza-web` y `portalcoraza-minuta` |

---

## Opcional (v1.1, no urgente)

- Quitar rutas `/minutas` del portal (`apps/web/features/minuta/`) tras validar producción
- Credenciales PUESTO de prueba documentadas en runbook interno
- Monitoreo uptime del segundo static site

---

*Última actualización: 29 ago 2026 — CORS OK; smoke test aplazado a próxima semana.*
