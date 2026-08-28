# Diseño — Minuta Virtual como app frontend separada

**Fecha:** 2026-08-28  
**Estado:** Aprobado (JHON)  
**Relacionado:** `2026-08-19-puesto-minuta-role-design.md`, `2026-08-19-minuta-virtual-completa-design.md`, `2026-08-19-operaciones-minutas-design.md`

## Objetivo

Minuta Virtual deja de ser un módulo más dentro del Portal Coraza y pasa a ser un **macroproyecto frontend** (`apps/minuta-web`): misma API NestJS, misma base Supabase, deploy independiente, UX orientada a tablet en puesto.

Portal Coraza sigue siendo el hub administrativo de la cooperativa. Minuta es el producto de campo para vigilantes.

## Decisiones (JHON 2026-08-28)

| Tema | Decisión |
|------|----------|
| Vigilantes / rol `PUESTO` | Entran **solo** por la app Minuta (URL aparte) |
| Gerencia / Operaciones | Siguen en **Portal Coraza** (`/operaciones/minutas`, PDF, consulta) |
| API | **Sin fork** — reutilizar `apps/api` módulo `minuta` |
| Base de datos | **Compartida** — tablas `minuta_*` existentes + `tenant_id`/RLS |
| Auth | Mismo JWT Portal (`POST /auth/login`, refresh, logout) |
| Scope puesto | Misma lógica `user_posts` + `resolvePostScope` (rol `PUESTO`) |
| Monorepo | `apps/minuta-web` nuevo workspace npm `@coraza/minuta-web` |

## Arquitectura

```
                    ┌─────────────────┐
                    │  Supabase (PG)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   apps/api      │
                    │  /api/v1/minuta │
                    └────────┬────────┘
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────────┐    │    ┌─────────▼─────────┐
     │   apps/web      │    │    │  apps/minuta-web   │
     │ Portal Coraza   │    │    │  Minuta Virtual    │
     │ operaciones,    │    │    │  inicio/nuevo/     │
     │ RRHH, nómina…   │    │    │  historial         │
     └─────────────────┘    │    └────────────────────┘
              Render #1      │         Render #2
     portalcoraza-web…       │    minuta…onrender.com
                             │    (dominio propio TBD)
```

## Roles y rutas

| Actor | App | Rutas principales | Permisos |
|-------|-----|-------------------|----------|
| Vigilante (`PUESTO`) | Minuta Web | `/`, `/nuevo`, `/historial` | `minuta.view`, `minuta.create` |
| Operaciones | Portal | `/operaciones/minutas` | `posts.view` |
| Admin / otros con minuta | Portal opcional | Quitar del menú lateral; acceso directo URL si aplica | `minuta.view` |

Tras login, `PUESTO` → redirect a URL Minuta (env `MINUTA_WEB_URL`), no `/minutas` del portal.

## Qué se mueve vs qué se queda

| Componente | Destino |
|------------|---------|
| `apps/web/features/minuta/*` | Migrar a `apps/minuta-web` |
| `MinutaApiService` | Copiar/adaptar en minuta-web |
| `apps/api/modules/minuta/*` | **Queda** |
| `apps/web/features/operaciones/minutas-list` | **Queda** en Portal |
| Item nav "Minuta Virtual" en `main-layout` | Ocultar para `PUESTO`; opcional ocultar globalmente y dejar solo Operaciones |

## Deploy y CORS

- Nuevo Static Site Render para `minuta-web` (mismo patrón que `web:build` + `spa-fallback-pages.js`)
- `CORS_ORIGIN` en API: añadir origen Minuta (prod + localhost dev)
- `environment.apiUrl` en minuta-web apunta a la misma API

## Fuera de alcance (v1)

- App **Vigía** móvil (`vigia_*`) — producto distinto, misma plataforma después
- PWA / offline queue
- Paquete npm compartido `@coraza/auth` (evaluar en v2 si hay duplicación dolorosa)
- Cambios de schema DB (ya cubierto en 042)
- White-label multi-marca

## Riesgos y mitigación

| Riesgo | Mitigación |
|--------|------------|
| Duplicar auth/interceptors | Copia mínima v1; extraer shared lib si >2 apps |
| Usuario PUESTO entra al portal por bookmark | Redirect en portal si rol `PUESTO` → Minuta URL |
| Dos builds CI | Scripts root `minuta:dev`, `minuta:build` |

## Criterios de éxito

1. Vigilante Amisi abre URL Minuta, login, ve solo su puesto (dashboard/historial/nuevo).
2. Operaciones abre Portal → Operaciones → Minutas, consulta y PDF sin cambios.
3. API única; datos en mismas tablas.
4. Portal no muestra menú Minuta para cuentas `PUESTO`.
5. `npm run minuta:build` y `npm run web:build` pasan; deploys independientes.

## Enfoque descartado

- **Layout lite dentro de `apps/web`:** menos DevOps pero bundle pesado y mezcla de identidades — descartado a favor de app separada.
