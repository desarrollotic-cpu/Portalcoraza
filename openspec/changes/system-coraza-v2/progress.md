# Progress Log — system-coraza-v2

## Corte de estado

- Fecha: 2026-06-23
- Fuente de verdad de avance: `tasks.md` (checkboxes)
- Estado global: Frontend Documental (11.x) completado; siguiente bloque 12.x (residencial)
- Nota operativa: CLI `openspec` no disponible en este entorno; el avance se mantiene por actualización directa de artefactos OpenSpec.

## Completado

- 0.x Prerequisitos/refactors base: completado
- 1.x RRHH: completado
- 2.x Base de datos: completado excepto 2.7 y 2.8 (acciones manuales en Supabase)
- 3.x Backend inventario: completado
- 4.x Backend entregas: completado parcialmente (4.3 pendiente por SDK oficial)
- 5.x Backend programación: completado
- 6.x Backend documental: completado
- 7.x Backend residencial: completado
- 8.x Backend notificaciones: completado
- 9.x Frontend Dotación: completado
- 10.x Frontend Programación: completado
- 11.x Frontend Documental: completado

## Pendiente inmediato

- 2.7 Crear bucket `delivery-signatures` en Supabase Storage con políticas
- 2.8 Activar Realtime en tabla `notifications`
- 4.3 Migrar integración de firma a SDK oficial de Supabase Storage (hoy funciona por API HTTP directa)
- 12.x Frontend Residencial (siguiente bloque de desarrollo)

## Siguiente lote recomendado (orden)

1. Ejecutar 12.x (Residencial)
2. Cerrar 4.3 y tareas Supabase 2.7 / 2.8
3. Continuar 13.x y verificación 14.x

## Criterios de continuidad entre IDs de desarrollo

Al retomar el change en otra sesión/agente:

1. Leer `proposal.md` y `design.md` para decisiones cerradas
2. Tomar `tasks.md` como única fuente de estado de implementación
3. Revisar este `progress.md` para contexto del último corte
4. Actualizar `tasks.md` y `progress.md` al finalizar cada bloque (3.x, 4.x, etc.)

## Notas del bloque 11.x (2026-06-23)

- Feature `apps/web/src/app/features/documental/`: listado con búsqueda por código y filtro por tipo, formulario metadata-only.
- Rutas `/documental`, `/documental/nuevo`, `/documental/:id/editar` con `permissionGuard`.
- Fix API: permisos del controller alineados con seed (`documental.view`, `documental.create`, `documental.manage`).

## Notas del bloque 10.x (2026-06-23)

- Feature `apps/web/src/app/features/programacion/`: matriz mensual Excel, calendario tabular, formulario de turno con edición/eliminación.
- Rutas `/programacion`, `/programacion/calendario`, `/programacion/turno/nuevo`, `/programacion/turno/:id/editar` con `permissionGuard`.
- Enlace en sidebar visible con permiso `scheduling.view`.
- Clic en celda de matriz navega a crear o editar turno según exista asignación.

## Notas del bloque 9.x (2026-06-23)

- Feature `apps/web/src/app/features/dotacion/`: inventario (listado, formulario ítem/variantes), entregas (listado, formulario con canvas de firma).
- Rutas `/dotacion`, `/dotacion/entregas`, etc. con `permissionGuard`.
- Enlace en sidebar visible con permiso `inventory.view`.
- Fix colateral: ruta de import `environment` en `associates-api.service.ts`.
