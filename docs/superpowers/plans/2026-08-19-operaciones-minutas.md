# Operaciones Minutas — Implementation Plan

> **For agentic workers:** `posts.view` · solo lectura · PDF por puesto+mes · reutilizar Minuta + pdfkit.

**Goal:** Submódulo en Operaciones para ver y descargar PDF de minutas de un puesto en un mes.

**Architecture:** Endpoints dedicados en `MinutaController` (permiso `posts.view`). UI en `features/operaciones/minutas-list`.

## File map

- `apps/api/src/modules/minuta/minuta.service.ts` — `operacionesHistorial` + `operacionesPdf`
- `apps/api/src/modules/minuta/minuta.controller.ts` — rutas GET
- `apps/api/src/modules/minuta/minuta-operaciones.spec.ts` — rango mes / validación
- `apps/web/.../operaciones-layout.ts` — nav
- `apps/web/.../app.routes.ts` — ruta hija
- `apps/web/.../operaciones-api.service.ts` — client JSON + blob PDF
- `apps/web/.../minutas-list/minutas-list.ts` — pantalla

## Tasks

1. API: query por postId+month + PDF pdfkit
2. Web: nav + ruta + pantalla consulta/descarga
3. Verificar tsc/ng build
