# Command Center Dashboard — design (Fase 1)

**Date:** 2026-08-19  
**Status:** approved (user: “haz todo como lo recomiendes”)  
**Approach:** C — híbrido por fases; esta spec cubre **Fase 1**.

## Goals

Convertir `/dashboard` en un **centro de inteligencia operativa** con jerarquía clara, datos reales, permisos por `*.view`, sin inventar métricas.

## Non-goals (Fase 1)

- Sparklines / % vs periodo en *todos* los KPIs (solo donde haya serie real).
- Dotación “completa vs incompleta” (no hay modelo; se usa sin-dotación + stock).
- “Turno próximo en N minutos” (no hay reloj de turnos del día en overview actual).
- Filtro global que reescriba *todas* las series (UI del filtro sí; aplica a series que lo soporten).
- Nueva librería de charts (SVG/CSS propios).
- Cambiar rutas, permisos seed, o paneles internos de módulos.

## Architecture

### Backend

`GET /api/v1/dashboard/command-center`

- Auth JWT + arma respuesta solo con módulos cuyo permiso tenga el usuario.
- Agregación **secuencial** (pooler session).
- Reutiliza servicios existentes (`HrDashboardService`, deliveries overview, reception, scheduling overview, documental analytics/notifications, users overview).
- Extras baratos Fase 1:
  - Recepción: entradas ayer + serie 14d (ya) + pico por hora (últimos 7 días) si hay filas.
  - Audit: últimas N entradas globales (nuevo listado read-only con permiso amplio o cualquier autenticado con al menos un `*.view`).

### Frontend

Reescribir `dashboard.ts` + `dashboard-api.service.ts` para consumir un solo endpoint.

Jerarquía visual:

1. Hero (saludo contextual + fecha + estado operación)
2. Lo más importante hoy (3–5 highlights)
3. Centro de alertas (crítica / advertencia / info)
4. KPIs principales
5. Estado operativo (barras %)
6. Bloques módulo (gráficas SVG + listas)
7. Actividad reciente (si audit responde)

## Status operativo

Derivado de alertas reales:

- `critical` si hay ≥1 alerta crítica → “Situación crítica”
- `attention` si hay advertencias → “Atención requerida”
- else → “Operación estable”

Scores (0–100) solo con fórmulas documentadas y datos reales; si falta denominador → omitir score o mostrar “Sin datos”.

| Score | Fórmula Fase 1 |
|-------|----------------|
| Personal | activos / (activos+inactivos+suspendidos+vacaciones) * 100 (excluye retirados) |
| Programación | posts con asignaciones / postsInMonth * 100 (si postsInMonth=0 → sin datos) |
| Dotación | 100 - min(100, lowStockCount*5 + withoutDotacion hint) — o mejor: si totalActive>0: (1 - without/totalActive)*100 y penalizar stock bajo |
| Documental | 100 - min(100, alertCount*8) |
| Recepción | si insideNow alto relativo no es “malo”; score informativo: based on today vs 14d avg closeness — o simplemente omitir si no hay definición clara. Prefer: presencia de datos = 100 - (visitors stuck?); keep simple: no inventar — use 100 if dashboard loads, or skip. |

**Dotación score (explícito):**  
`completeRatio = 1 - withoutDotacionCount / max(totalActiveAssociates,1)`  
`stockPenalty = min(30, lowStockCount * 3)`  
`score = clamp(0,100, completeRatio*100 - stockPenalty)`

**Recepción score:** informativo, no “salud”:  
si `todayEntries` y avg14 > 0: `100 - min(40, abs(today-avg)/avg*100)` else omitir si no hay entradas en 14d.

## Permissions

Same map as global dashboard v1. No bypass por rol; GERENCIA/AUDITOR ven todo vía permisos.

## Fase 2 (fuera de implementación inmediata)

- Históricos KPI / sparklines persistidos
- Cobertura diaria de turnos + countdown
- Dotación completa/incompleta por checklist de elementos
- Filtro periodo global completo
- Endpoint actividad más rico

## Success criteria

- Un solo HTTP principal al abrir Dashboard (command-center).
- Admin entiende en ~10s estado + alertas + a dónde ir.
- Cero métricas inventadas.
- Build web + API OK; sin romper rutas/módulos.
