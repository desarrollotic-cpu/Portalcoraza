# Module stats panels — design

**Date:** 2026-08-05  
**Status:** approved (2026-08-05) — implementation plan ready  
**Scope:** Unify/improve per-module main panels with KPIs + 1–2 short charts/lists.

## Goals

- Every operational module opens on a **main panel** with the most important statistics.
- Visual depth: **level 2** — 4–6 KPI cards + 1–2 mini charts or short lists, with links into the module.
- Pattern: **shared UI shell + one overview endpoint per module** (sequential DB queries; avoid pool saturation).
- Delivery order (**phase 1 first**):
  1. Create missing panels: **Programación**, **Administración**
  2. Align existing: Dotación, Recepción, Documental
  3. Visual alignment only for RRHH (already has a richer panel)

## Non-goals

- Redesign of the global `/dashboard`.
- New Excel/export features.
- Real-time / websocket stats.
- Mega-endpoint that returns all modules in one request.

## Decisions

| Decision | Choice |
|----------|--------|
| Strategy | Improve existing panels + add missing ones |
| Depth | KPIs + 1–2 charts/lists |
| Architecture | Shared Angular stats components + per-module `overview` API |
| Order | Programación + Admin → Dotación/Recepción/Documental → RRHH polish |
| Permissions | Gate with existing `*.view`; no write actions on panels |

## Shared UI

New reusable pieces under `apps/web/src/app/shared/components/`:

1. **`StatsKpiGrid`** — grid of KPI cards (label, value, hint, optional icon, optional `routerLink`).
2. **`StatsMiniBars`** — simple bar chart for a small series (e.g. last N days / coverage by day).
3. Optional thin **`StatsListCard`** — titled list/table for top-N or alerts (can stay inline in panel if trivial).

Conventions (match Dotación / RRHH panels):

- Skeleton while loading.
- Inline error message on failure (do not rely on global `alert()` for panel UX).
- Cards clickable only when the target route is allowed by permissions.
- No new design system; reuse existing CSS variables / patterns from `dot-dash-kpi` / `hr-dash-kpi`.

Each module keeps its own `*-panel` component; it composes the shared pieces and calls its overview API.

## Phase 1 — missing panels

### Programación

**Routes**

- `/programacion` → new panel (default).
- Nav: Panel · Matriz multi-puesto · Cuadro mensual.
- Keep `/programacion/matriz` and `/programacion/cuadro`.

**API**

- `GET /api/v1/scheduling/monthly/overview?year=&month=`
- Permission: `scheduling.view`
- Implementation: aggregate from existing monthly schedule + conflicts + templates services; **sequential** queries.

**Payload (indicative)**

```ts
{
  year: number;
  month: number;
  kpis: {
    postsInMonth: number;       // puestos con cuadro en el mes
    assignedCells: number;      // celdas/asignaciones no vacías
    conflicts: number;          // conflictos abiertos del mes
    templates: number;          // plantillas disponibles
  };
  series: Array<{ key: string; label: string; value: number }>; // e.g. conflictos por puesto (top) o cobertura por día
}
```

Exact series shape may use `conflicts` top-N by post if day coverage is expensive; prefer one cheap aggregation.

**UI**

- 4 KPI cards → links to matriz/cuadro where relevant.
- Mini bars or short list for `series`.
- CTA text only; no generate-motor buttons on the panel for users without `scheduling.edit`.

### Administración

**Routes**

- `/admin` → new panel (default).
- Nav: Panel · Usuarios · Roles.
- Keep `/admin/usuarios` and `/admin/roles`.

**API**

- `GET /api/v1/users/overview` (roles counted via join/query on `roles` table).
- Permission: `users.view`. If the caller lacks `roles.view`, still return `kpis.roles` as total roles count (metadata, not role detail); hide the Roles nav link in UI without `roles.view`.

**Payload (indicative)**

```ts
{
  kpis: {
    usersActive: number;
    usersInactive: number;
    roles: number;
  };
  recentUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    roleName: string;
    isActive: boolean;
    createdAt: string;
  }>; // last 5–8
}
```

**UI**

- KPI cards + list “Últimos usuarios”.
- Links to Usuarios / Roles gated by `users.view` / `roles.view`.
- No create-user CTA without `users.create`.

## Phase 2 — align existing panels

| Module | Current | Work |
|--------|---------|------|
| Dotación | `dotacion-panel` + deliveries overview | Adopt `StatsKpiGrid` / mini chart; keep existing KPIs (asociados, artículos, stock bajo, pendientes, etc.) |
| Recepción | `reception-panel` + `/reception/dashboard` | Adopt shared KPI/bars; keep inside-now + 14-day series |
| Documental | `documental-panel` + analytics/alerts | Adopt shared KPI grid; keep alert list as short list card |
| RRHH | `hr-dashboard` (rich) | Visual alignment only (shared KPI component where cheap); no behavior rewrite |

No contract breaks for existing overview endpoints unless a small additive field is needed.

## Permissions

- Panels are read-only surfaces.
- Overview endpoints require the module’s view permission.
- Auditor (`*.view` only) must see panels and not see write CTAs.
- Global error interceptor may still alert on 500; panels must also show inline error so the page is usable after dismiss.

## Performance / reliability

- One HTTP call per panel load.
- Server-side aggregations; avoid N+1 and avoid large `Promise.all` fan-out (lesson from HR `EMAXCONNSESSION`).
- Prefer sequential awaits or ≤2 parallel queries inside overview handlers.
- Keep Supabase pool caps as configured for session mode.

## Testing (minimum)

- API: overview returns 200 for authorized role; 403 without permission; KPI fields present.
- Web: Programación and Admin default routes render panel; matriz/usuarios still reachable from nav.
- Manual: login as Auditor — panels visible, no write buttons.

## Implementation order (checklist)

1. Shared `StatsKpiGrid` (+ mini bars if needed).
2. Scheduling monthly overview API + `programacion-panel` + routes/nav.
3. Users/admin overview API + `admin-panel` + routes/nav.
4. Phase 2: Dotación → Recepción → Documental → RRHH polish.
5. Smoke on local; then commit/PR when requested.

## Success criteria

- Opening each module lands on a stats panel (Programación and Admin included).
- Each panel shows clear KPIs + at least one secondary visualization or list.
- Look-and-feel is consistent across modules.
- No regression of pool exhaustion under normal panel load.
