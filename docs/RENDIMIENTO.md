# Rendimiento — Portal Coraza

**Fecha:** 2026-08-18  
**Tipo:** revisión de código y esquema (no APM en vivo).  
**Veredicto:** aceptable para el volumen actual. El techo real es el **session pooler de Supabase**, no la CPU del API.

Volúmenes de referencia: ~4 590 asociados (migración GH), catálogo de dotación pequeño, `DB_POOL_MAX` 5 en URLs de Supabase (`apps/api/src/app.module.ts`).

## Controles que ya ayudan

| Área | Control | Efecto |
|------|---------|--------|
| Postgres | Pool máximo 5 + keepalive | Evita `EMAXCONNSESSION` (~15 sesiones en pooler) |
| RRHH | Directorio y retiros paginados (50, máx. 2000) | No baja toda la nómina de un golpe |
| RRHH | Índice `idx_associate_history_associate` (026) | Bitácora por asociado |
| Dotación | Índice `idx_deliveries_status_delivered` (026) | Conteos del panel |
| Dotación | `inventory_stock` UNIQUE (variante, almacén) (035) | Stock Medellín/Rionegro |
| Dashboard | Fallo de un módulo → ceros | Un overview lento no tumba la home |

## Mitigado (2026-08-19)

- **`by-month`**: assignments con columnas mínimas; omite `sin_asignar`. Overview de Programación usa agregaciones SQL (no baja la matriz).
- **Dotación / Recepción / Documental analytics**: queries en serie (mismo patrón que Programación/Admin) para no saturar el pool 5.

## Hallazgos restantes

1. **Filtro de antigüedad** en Directorio: si hay `tenureMinYears` / `tenureMaxYears`, se cargan todos los coincidentes y se recorta en memoria. Sin ese filtro, usa `skip/take` en SQL.
2. **Programación** pide asociados con `limit: 2000`. Hoy cabe; si los activos superan eso, el cuadro queda corto.
3. **Historial de Dotación** junta hasta 200 movimientos y el listado de entregas sin paginar. Suficiente con catálogo chico.

## Qué no hace falta optimizar ahora

- Recalcular `stock_current` de la variante como suma de almacenes (catálogo pequeño).
- Paginar `listVariants` (pocas tallas).
- Índices extra en `inventory_movements` más allá de `warehouse_id + created_at` (035).

## Fuera de rendimiento

Puestos operativos ya cargados (226). Turnos/asignaciones: agosto 2026 cargado en **borrador** (8 puestos). Meses siguientes: mismo procedimiento, sin pisar.
