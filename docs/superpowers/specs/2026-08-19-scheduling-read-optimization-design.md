# Design: optimización de lecturas (Programación + overviews)

**Fecha:** 2026-08-19  
**Estado:** aprobado  
**Alcance:** C — `by-month`, overview Programación, overviews Dotación/Recepción/Documental

## Objetivo

Reducir payload y presión al pooler de Supabase **sin cambiar UI ni reglas de negocio**.

## Enfoque

Payload liviano en `GET .../by-month` + KPIs de Programación con agregaciones SQL + overviews en serie (no `Promise.all`).

## Cambios

### 1. `listByMonth`

- Cargar schedules del mes sin `relations` completas.
- Cargar assignments en query separada con columnas mínimas: `id`, `scheduleId`, `day`, `role`, `associateId`, `turno`, `jornada`, `codigo`, `inicio`, `fin`.
- Excluir filas con `jornada = sin_asignar` (la matriz ya las ignora).
- `getOne` / save / motor: sin cambio.

### 2. `overview` Programación

- No llamar `listByMonth`.
- `postsInMonth`: `COUNT` en `monthly_schedules`.
- `assignedCells`: `COUNT` join assignments con filtro associate + jornada.
- Serie: top 8 por conflictos (si hay) o por celdas asignadas por puesto.
- Forma JSON de respuesta **idéntica**.

### 3. Overviews Dotación / Recepción / Documental analytics

- Sustituir `Promise.all` por awaits secuenciales.
- Misma respuesta al front.

## Fuera de alcance

- Paginar la matriz en UI.
- Nuevos endpoints.
- Índices nuevos (ya existen `idx_monthly_schedules_month`, `idx_schedule_assignments_schedule`).

## Éxito

- Mayo 2026 vía API `by-month` usable (smoke puede validar API, no solo BD).
- Tests overview Programación verdes.
- UI y KPIs sin cambios funcionales.
