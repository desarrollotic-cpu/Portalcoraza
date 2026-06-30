# Progress Log — system-coraza-v2

> Handoff para compañeros: [`docs/CONTINUAR-DESARROLLO.md`](../../docs/CONTINUAR-DESARROLLO.md)

## Corte de estado

- Fecha: 2026-06-29
- Fuente de verdad de avance: `tasks.md` (checkboxes)
- Estado global: Desarrollo funcional completo (bloques 0–13); verificación parcial 14.x; **cierre Supabase + E2E manual al final**
- Nota operativa: CLI `openspec` operativo tras configurar PATH de npm global.

## Completado

- 0.x Prerequisitos/refactors base: completado
- 1.x RRHH: completado
- 2.x Base de datos: completado excepto 2.7 y 2.8 (acciones manuales en Supabase)
- 3.x Backend inventario: completado
- 4.x Backend entregas: completado
- 5.x Backend programación: completado
- 6.x Backend documental: completado
- 7.x Backend residencial: completado
- 8.x Backend notificaciones: completado
- 9.x Frontend Dotación: completado
- 10.x Frontend Programación: completado
- 11.x Frontend Documental: completado
- 12.x Frontend Residencial: completado
- 13.x Frontend Notificaciones y Admin: completado
- 15.x Frontend Login y branding: completado (ver bitácora del día)

## Pendiente inmediato

_Ningún bloque de código pendiente en fase 1. Siguiente hito: cierre Supabase + pruebas E2E._

## Cierre Supabase + E2E (dejar para lo último)

Ejecutar en este orden cuando tengas acceso al dashboard:

1. **14.1** — Migraciones SQL `002`–`007` en SQL Editor (si faltan)
2. **Seed** — `003_business_permissions.sql` (incluye rol SUPERVISOR)
3. **2.7** — Bucket `delivery-signatures` en Storage
4. **2.8** — Realtime en tabla `notifications`
5. **`apps/api/.env`** — `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, JWT secrets
6. **E2E manual** — 14.5, 14.6, 14.7, 14.8, 14.10 (y confirmar 14.3 en runtime)
7. **15.7** — (opcional) logo PNG

## Pendiente histórico (referencia)

- 2.7 Crear bucket `delivery-signatures` en Supabase Storage con políticas
- 2.8 Activar Realtime en tabla `notifications`
- 14.x verificaciones E2E restantes (con Supabase configurado)
- Opcional: `coraza-logo.png` en `apps/web/public/images/`

## Siguiente lote recomendado (orden)

1. **Cierre Supabase + E2E** (bloque anterior) cuando el equipo esté listo
2. Desplegar en Render si aplica
3. `/opsx:archive` del change system-coraza-v2

## Criterios de continuidad entre IDs de desarrollo

Al retomar el change en otra sesión/agente:

1. Leer `proposal.md` y `design.md` para decisiones cerradas
2. Tomar `tasks.md` como única fuente de estado de implementación
3. Revisar este `progress.md` para contexto del último corte
4. Actualizar `tasks.md` y `progress.md` al finalizar cada bloque (3.x, 4.x, etc.)

---

## Bitácora — 2026-06-29

### Validación bloque anterior (11.x Documental)

- Revisado: `DocumentalApiService`, `documents-list`, `document-form`, rutas `/documental` y enlace en sidebar.
- **11.x completo** — sin tareas pendientes en ese bloque.

### Bloque 12.x — Frontend Residencial

- `apps/web/src/app/features/residential/residential-api.service.ts` — cliente HTTP para unidades, visitantes, paquetes, reservas y libro virtual.
- `units-list` — listado de unidades del puesto asignado.
- `visitors-log` — entrada/salida de visitantes, historial y libro virtual por unidad.
- `packages` — recepción y entrega de paquetería.
- `reservations` — CRUD de reservas con cambio de estado (aprobar, rechazar, completar, cancelar).
- Rutas: `/residential`, `/residential/visitantes`, `/residential/paquetes`, `/residential/reservas` con `permissionGuard`.
- Sidebar: enlace Residencial con permiso `residential.view`.
- `npm run web:build` — OK.

### Bloque 13.x — Notificaciones y Admin

- `@supabase/supabase-js` instalado en `apps/web`.
- `core/services/notification.service.ts` — carga API + suscripción Realtime por `user_id`.
- `MainLayout` — campana con badge, panel dropdown, marcar leídas.
- `features/admin/` — `users-list` (listado + crear usuario), `roles-permissions` (asignación con checkboxes).
- Backend: `PUT /roles/:id/permissions` con permiso `roles.manage`.
- Rutas `/admin/usuarios`, `/admin/roles`.
- `dashboard` + `dashboard-api.service` — widgets por rol (GERENCIA, SUPERVISOR, ADMINISTRADOR_UNIDAD).
### Bloque 14.x — Verificación (parcial, sin Supabase)

- `supabase/seed/003_business_permissions.sql` — permisos de negocio + rol SUPERVISOR + asignaciones por rol.
- Revisión estática: login con `permissions[]` (auth.service), PermissionsGuard sin DB, JWT 2h/7d, `/programacion` → matriz Excel.
- E2E y Supabase diferidos a sección **Cierre Supabase + E2E**.

### Bloque 4.3 + refresh token (sin Supabase dashboard)

- `SupabaseStorageService` + `@supabase/supabase-js` en API — subida de firmas vía SDK oficial.
- `error.interceptor.ts` — reintento automático con `POST /auth/refresh` ante 401.
- `docs/SUPABASE.md` — seed `003` documentado.

---

## Bitácora detallada — 2026-06-23

### Producción Render (operativo)

| Servicio | URL | Estado |
|----------|-----|--------|
| API NestJS | `https://portalcoraza.onrender.com` | Activo |
| Frontend Angular | `https://portalcoraza-web.onrender.com` | Activo |
| Login producción | `https://portalcoraza-web.onrender.com/auth/login` | Funcional |

- **CORS API:** `CORS_ORIGIN=https://portalcoraza-web.onrender.com`
- **Login verificado:** `admin@coraza.local` / `Coraza2026!` → rol GERENCIA
- **Supabase:** proyecto despausado; API usa Session pooler (`DATABASE_URL` con usuario `postgres.<ref>`)
- **Static Site Publish Directory:** `apps/web/dist/web/browser` (crítico para servir `/videos/*`)

### Commits del día (orden cronológico)

| Commit | Descripción |
|--------|-------------|
| `ccb4b21` | Backend residencial + notificaciones |
| `7dff10a` | Frontend dotación + deploy Render (`render.yaml`, `_redirects`) |
| `590e166` | Frontend programación + documental; primer rediseño login split |
| `69a3fe9` | Login: campos más anchos en panel izquierdo |
| `8d80974` | Login: formulario centrado verticalmente |
| `803c4b3` | Login: estilo referencia (inputs underline, botón píldora, toggle contraseña) |
| `17b5986` | Soporte video animado en panel derecho del login |
| `62aa1c0` | Asset: `coraza-logo.mp4` (~2,6 MB) |
| `ccdbb4e` | Fix: video no cargaba en Render ( `_redirects` + reproducción programática) |

### Bloque 9.x — Frontend Dotación

- Feature `apps/web/src/app/features/dotacion/`: inventario (listado, formulario ítem/variantes), entregas (listado, formulario con canvas de firma).
- Rutas `/dotacion`, `/dotacion/entregas`, etc. con `permissionGuard`.
- Enlace en sidebar visible con permiso `inventory.view`.
- Fix colateral: ruta de import `environment` en `associates-api.service.ts`.
- Deploy Static Site en Render documentado en `docs/DEPLOY-RENDER.md`.

### Bloque 10.x — Frontend Programación

- Feature `apps/web/src/app/features/programacion/`:
  - `SchedulingApiService`
  - `schedule-matrix` — vista principal mensual tipo Excel
  - `schedule-calendar` — vista complementaria tabular
  - `shift-form` — crear/editar/eliminar turnos
- Rutas: `/programacion`, `/programacion/calendario`, `/programacion/turno/nuevo`, `/programacion/turno/:id/editar`
- Sidebar con permiso `scheduling.view`
- Clic en celda de matriz navega a crear o editar según exista turno
- Fix API: `DELETE /scheduling/shifts/:id` usa permiso `scheduling.edit` (no existía `scheduling.delete` en seed)

### Bloque 11.x — Frontend Documental

- Feature `apps/web/src/app/features/documental/`:
  - `DocumentalApiService`
  - `documents-list` — búsqueda por código + filtro por tipo (client-side)
  - `document-form` — metadata-only (sin archivos en fase 1)
- Rutas: `/documental`, `/documental/nuevo`, `/documental/:id/editar`
- Sidebar con permiso `documental.view`
- Fix API: permisos del controller alineados con seed (`documental.view`, `documental.create`, `documental.manage` — antes usaba `documental.records.*` / `documental.types.*` inexistentes)

### Bloque 15.x — Login y branding (transversal)

**Layout split (`auth-layout.ts`):**

- Panel izquierdo (~38vw): formulario sobre fondo blanco, centrado verticalmente
- Panel derecho: video animado del logo en loop (`/videos/coraza-logo.mp4`)
- Fallback si el video falla: texto "Coraza" en panel derecho

**Formulario (`login.ts`):**

- Estilo inspirado en referencia Satrack: saludo "¡Hola! Bienvenido", inputs con línea inferior (Material-like), botón píldora ancho completo
- Toggle mostrar/ocultar contraseña (icono ojo)
- Logo pequeño arriba del formulario (`/images/coraza-logo.png` — pendiente archivo PNG del usuario)

**Assets estáticos:**

| Archivo | Ruta en repo | Uso |
|---------|--------------|-----|
| Video animado | `apps/web/public/videos/coraza-logo.mp4` | Panel derecho login |
| Logo PNG (opcional) | `apps/web/public/images/coraza-logo.png` | Formulario + poster del video |
| SPA routing | `render.yaml` rewrite `/* → /index.html` | Rutas Angular |
| `_redirects` | `apps/web/public/_redirects` | **Sin catch-all** — evita bloquear `/videos/*` |

**Incidente resuelto — video invisible en producción:**

1. Archivo subido inicialmente como `coraza-logo.mp4.mp4` (doble extensión Windows) → renombrado
2. `_redirects` con `/* /index.html 200` podía interceptar peticiones al MP4 → eliminado catch-all
3. Fallback anterior ocultaba video e imagen inexistente → panel vacío; corregido con fallback a texto

**Verificación post-deploy:**

- Abrir directamente: `https://portalcoraza-web.onrender.com/videos/coraza-logo.mp4`
- Debe descargar/reproducir el video, no devolver HTML del SPA

### Fixes backend menores (mismo día)

- `scheduling.controller.ts`: permiso delete → `scheduling.edit`
- `documental.controller.ts`: permisos alineados con seed

### Archivos clave tocados hoy (frontend)

```
apps/web/src/app/features/programacion/
apps/web/src/app/features/documental/
apps/web/src/app/features/auth/login/login.ts
apps/web/src/app/layouts/auth-layout/auth-layout.ts
apps/web/src/app/layouts/main-layout/main-layout.ts
apps/web/src/app/app.routes.ts
apps/web/public/videos/coraza-logo.mp4
apps/web/public/_redirects
render.yaml
docs/DEPLOY-RENDER.md
```
