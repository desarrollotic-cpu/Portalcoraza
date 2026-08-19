# Global Dashboard — design

**Date:** 2026-08-19  
**Status:** approved — implemented (2026-08-19)  
**Scope:** Redesign `/dashboard` as a permission-filtered operational home that surfaces data from all core modules.

## Goals

- Connect the global Dashboard to **all core modules** the user can see.
- Layout **híbrido**: franja “Hoy / Alertas” arriba + bloques por módulo abajo.
- Filtrar por permisos (`*.view`). **GERENCIA** y **AUDITOR** ven el núcleo completo (tienen view amplio).
- Reutilizar overviews/APIs existentes (sin mega-endpoint en v1).
- Carga cuidadosa del pool (serie o máx. 2 en paralelo).

## Non-goals (v1)

- Endpoint unificado `GET /dashboard/overview`.
- SST, Vigilante/Minuta, Contabilidad/PUC (fase 2).
- Gráficos pesados o realtime/websocket.
- Botones de escritura en el Dashboard (solo lectura + navegación).
- Cambiar los paneles internos de cada módulo (`*-panel`).

## Decisions

| Decision | Choice |
|----------|--------|
| Layout | Híbrido: alertas arriba + secciones por módulo |
| Datos | Reutilizar overviews existentes desde el front |
| Alcance v1 | RRHH, Dotación, Recepción, Programación, Documental, Admin |
| Visibilidad | Por permiso `*.view`, no por `role.code` hardcodeado |
| GERENCIA / AUDITOR | Ven todo el núcleo (tienen los view) |
| Carga | Serie (preferida) o ≤2 paralelo; cada bloque tolerante a fallo |
| UI | Reusar patrones actuales del dashboard + `StatsKpiGrid` donde encaje |

## Current state (problem)

- `DashboardApiService.loadForRole` solo arma KPIs útiles para `GERENCIA`.
- La UI ignora `SUPERVISOR` y roles con permisos parciales.
- No consume `/hr/dashboard/overview`, `/deliveries/overview`, `/reception/dashboard`, `/scheduling/monthly/overview`, documental analytics/alerts, `/users/overview`.
- Quien no es GERENCIA ve casi solo el hero vacío.

## Architecture

### Orquestador front

1. `Dashboard` (Angular) lee `AuthService` permissions.
2. `DashboardApiService` (reescribir) expone `loadHome(): Observable<DashboardHome>`:
   - Decide qué fuentes llamar según permisos.
   - Encadena llamadas (concatMap / reduce serie) para no saturar pool.
   - Cada fuente con `catchError` → `{ ok: false, error }` sin tumbar el resto.
3. El template pinta:
   - Hero (saludo / rol / CTAs a módulos permitidos) — ya existe; ampliar CTAs faltantes (Recepción, Admin).
   - Franja **Hoy / Alertas**.
   - Grid de **ModuleSection** cards.

No hay cambios de backend en v1 salvo que un overview ya existente falle por permiso (entonces se corrige el gate, no se inventa API nueva).

### Permission → source map

| Module key | Permission gate | API (existente) |
|------------|-----------------|-----------------|
| `rrhh` | `associates.view` | `GET /hr/dashboard/overview` |
| `dotacion` | `inventory.view` **o** `deliveries.view` | `GET /deliveries/overview` |
| `recepcion` | `reception.view` | `GET /reception/dashboard` |
| `programacion` | `scheduling.view` | `GET /scheduling/monthly/overview?year&month` (mes actual) |
| `documental` | `documental.view` | `GET /documental/analytics` + `GET /documental/alerts` (o el endpoint que ya use el panel) |
| `admin` | `users.view` | `GET /users/overview` |

Si el usuario no tiene el permiso, **no** se hace la request.

GERENCIA / AUDITOR no reciben lógica especial de “bypass”: su set de permisos ya cubre el núcleo. Si en BD algún view falta, se arregla en seed/roles, no en el Dashboard.

## UI structure

### 1. Hoy / Alertas (máx. ~6 chips)

Señal solo si el módulo cargó OK y el umbral aplica:

| Chip | Source | Condición | Link |
|------|--------|-----------|------|
| Dotaciones pendientes | Dotación | `pendingDeliveries > 0` | `/dotacion/entregas` |
| Stock bajo | Dotación | `lowStockCount > 0` | `/dotacion/inventario` |
| Visitantes dentro | Recepción | `stats.insideNow > 0` | `/recepcion` |
| Conflictos programación | Programación | `kpis.conflicts > 0` | `/programacion` |
| Alertas documentales | Documental | `alerts.length > 0` | `/documental` |
| Asociados activos | RRHH | siempre (contexto, no “alerta roja”) | `/rrhh` |

Si no hay chips de alerta (solo contexto o vacío) → mensaje: “Sin alertas operativas”.

### 2. Bloques por módulo

Cada bloque: título, 2–4 KPIs, CTA “Ir a …”, estado loading/error propio.

| Bloque | KPIs |
|--------|------|
| RRHH | Activos (`counts.ACTIVO`), total derivados de `counts` si útil |
| Dotación | Pendientes, stock bajo, entregadas hoy, sin dotación |
| Recepción | Dentro ahora, entradas hoy, entradas mes |
| Programación | Puestos en mes, celdas asignadas, conflictos, plantillas |
| Documental | Correspondencia, minutas, préstamos activos (+ conteo alertas) |
| Admin | Usuarios activos, inactivos, roles |

Reusar `StatsKpiGrid` si el look queda alineado; si no, adaptar el `kpi-grid` actual del dashboard con secciones.

## Data contract (front)

```ts
interface DashboardHome {
  alerts: DashboardAlertChip[];
  sections: DashboardSection[];
}

interface DashboardAlertChip {
  id: string;
  label: string;
  value: number;
  tone: 'info' | 'warn' | 'danger';
  route: string;
}

interface DashboardSection {
  key: 'rrhh' | 'dotacion' | 'recepcion' | 'programacion' | 'documental' | 'admin';
  title: string;
  route: string;
  status: 'ok' | 'error' | 'loading';
  errorMessage?: string;
  kpis: { label: string; value: number; hint?: string; route?: string }[];
}
```

Exact mapping from each overview DTO vive en el servicio (una función por fuente).

## Error handling

- 403 / fallo de red en una fuente → `status: 'error'` en esa sección; resto intacto.
- No usar `alert()` global como UX principal del dashboard.
- Hero siempre visible aunque fallen todos los overviews.

## Performance

- Preferir **serie** entre módulos.
- Si se paraleliza, **máximo 2** requests concurrentes.
- No volver a listar colecciones grandes (`/associates`, `/deliveries` completas) como hace hoy `loadGerenciaStats`.
- Documental: preferir analytics + alerts (ya usados por el panel), no `records` enteros.

## Testing (mínimo)

- Usuario solo Recepción: ve hero + alertas/recepción + bloque Recepción; no llama Dotación/RRHH.
- GERENCIA o AUDITOR: aparecen los 6 bloques del núcleo (según permisos reales del seed).
- Un overview 500: ese bloque en error; los demás OK.
- Smoke manual post-deploy con demo admin.

## Implementation order

1. Reescribir `dashboard-api.service.ts` (permission gates + serie + mappers).
2. Actualizar `dashboard.ts` template: alertas + secciones; quitar hardcode `GERENCIA`.
3. Ampliar CTAs del hero (Recepción, Admin) según permiso.
4. Verificar permisos seed GERENCIA/AUDITOR cubren el núcleo.
5. Smoke local; commit/push cuando JHON lo pida.

## Phase 2 (fuera de este spec)

- SST overview, Vigilante/Minuta resumen, Contabilidad.
- Opcional: `GET /dashboard/overview` server-side si el front se vuelve frágil.
- Mini charts en la franja de alertas.

## Success criteria

- El Dashboard deja de depender de `role.code === 'GERENCIA'`.
- Muestra datos reales de todos los módulos del núcleo permitidos.
- GERENCIA y AUDITOR ven el panorama completo del núcleo.
- Un usuario con un solo módulo ve solo ese bloque.
- No regresiones de pool bajo carga normal del home.
