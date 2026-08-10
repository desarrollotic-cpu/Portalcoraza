# Module stats panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every module a main stats panel (KPIs + 1–2 short visualizations), starting with Programación and Administración, then aligning Dotación, Recepción, Documental, and polishing RRHH.

**Architecture:** Shared Angular `StatsKpiGrid` / `StatsMiniBars` components; each module keeps its own `*-panel` and calls one `overview` API. Overview handlers use sequential DB queries to avoid Supabase session-pool exhaustion.

**Tech Stack:** NestJS + TypeORM, Angular standalone components, existing `ModuleShell` / permission guards. No new npm dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-05-module-stats-panels-design.md`
- Ponytail: smallest diff; reuse Dotación/RRHH visual patterns; no mega `/stats/all` endpoint.
- Permissions: overview endpoints use existing `*.view` only; no write CTAs without create/edit/manage.
- DB: sequential (or ≤2 parallel) queries inside overview; keep Supabase pool cap behavior.
- No redesign of global `/dashboard`; no new exports; no realtime.
- Commits only when JHON asks (or at end of a task if he already authorized commits for this work).

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/web/src/app/shared/components/stats-kpi-grid/stats-kpi-grid.ts` | Shared KPI cards |
| `apps/web/src/app/shared/components/stats-mini-bars/stats-mini-bars.ts` | Shared mini bar chart |
| `apps/api/src/modules/scheduling/monthly-scheduling.service.ts` | `overview(year, month)` |
| `apps/api/src/modules/scheduling/monthly-scheduling.controller.ts` | `GET scheduling/monthly/overview` |
| `apps/api/src/modules/scheduling/monthly-scheduling.service.spec.ts` | Unit tests for overview |
| `apps/web/src/app/features/programacion/monthly-scheduling-api.service.ts` | Client `getOverview` |
| `apps/web/src/app/features/programacion/programacion-panel/programacion-panel.ts` | Panel UI |
| `apps/web/src/app/features/programacion/programacion-layout/programacion-layout.ts` | Nav + Panel item |
| `apps/web/src/app/app.routes.ts` | Default route → panel |
| `apps/api/src/modules/users/users.service.ts` | `overview()` |
| `apps/api/src/modules/users/users.controller.ts` | `GET users/overview` (before `:id` routes) |
| `apps/api/src/modules/users/users.service.spec.ts` | Unit tests (create if missing) |
| `apps/web/src/app/features/admin/admin-api.service.ts` or users client | Client overview |
| `apps/web/src/app/features/admin/admin-panel/admin-panel.ts` | Panel UI |
| `apps/web/src/app/features/admin/admin-layout/admin-layout.ts` | Nav + Panel item |
| Phase 2 panels | Dotación / Recepción / Documental / RRHH adopt shared components |

---

### Task 1: Shared StatsKpiGrid + StatsMiniBars

**Files:**
- Create: `apps/web/src/app/shared/components/stats-kpi-grid/stats-kpi-grid.ts`
- Create: `apps/web/src/app/shared/components/stats-mini-bars/stats-mini-bars.ts`

**Interfaces:**
- Produces:
  - `StatsKpiItem = { label: string; value: string | number; hint?: string; link?: string | null; warn?: boolean }`
  - `StatsKpiGrid` inputs: `items: StatsKpiItem[]`, `loading?: boolean`
  - `StatsSeriesPoint = { key: string; label: string; value: number }`
  - `StatsMiniBars` inputs: `title: string`, `series: StatsSeriesPoint[]`, `loading?: boolean`

- [ ] **Step 1: Create `StatsKpiGrid` standalone component**

```ts
// stats-kpi-grid.ts — selector app-stats-kpi-grid
// Template: skeleton grid when loading; else cards.
// If item.link use <a [routerLink]="item.link"> else <div>.
// Styles: copy structure from .dot-dash-kpi-grid / .dot-dash-kpi in dotacion-panel
// (CSS variables --coraza-* if used elsewhere; keep self-contained styles array).
```

Export type `StatsKpiItem` from the same file.

- [ ] **Step 2: Create `StatsMiniBars` standalone component**

```ts
// stats-mini-bars.ts — selector app-stats-mini-bars
// Template: title + flex row of bars; height % = value / max(series.values, 1) * 100
// Empty series → muted "Sin datos".
```

- [ ] **Step 3: Smoke in Story-less local check**

Run: `npm run web:build -w @coraza/web` (or `ng build` via workspace script)  
Expected: build succeeds with new components unused (tree-shaken OK) or at least no TS errors.

- [ ] **Step 4: Commit** (when authorized)

```bash
git add apps/web/src/app/shared/components/stats-kpi-grid apps/web/src/app/shared/components/stats-mini-bars
git commit -m "feat(web): add shared StatsKpiGrid and StatsMiniBars"
```

---

### Task 2: Scheduling monthly overview API

**Files:**
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.service.ts`
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.controller.ts`
- Modify/Create: `apps/api/src/modules/scheduling/monthly-scheduling.service.spec.ts` (or adjacent `*.overview.spec.ts`)

**Interfaces:**
- Consumes: existing `listByMonth`, `findConflicts`, `listTemplates` (call sequentially inside `overview`)
- Produces:

```ts
async overview(year: number, month: number): Promise<{
  year: number;
  month: number;
  kpis: {
    postsInMonth: number;
    assignedCells: number;
    conflicts: number;
    templates: number;
  };
  series: Array<{ key: string; label: string; value: number }>;
}>
```

`series`: top up to 8 posts by conflict count (count how many conflict rows include each `postId`). If no conflicts, series = posts with assignment counts (top 8 by assigned cell count) so the chart is never empty when there is data.

- [ ] **Step 1: Write failing unit test for `overview`**

```ts
it('overview aggregates posts, assignments, conflicts, templates', async () => {
  // mock repos / service methods:
  // listByMonth → 2 schedules, one with 3 assignments (associateId set, jornada not sin_asignar)
  // findConflicts → 1 row with postIds [postA, postB]
  // listTemplates → [{}, {}]
  const result = await service.overview(2026, 8);
  expect(result.kpis.postsInMonth).toBe(2);
  expect(result.kpis.conflicts).toBe(1);
  expect(result.kpis.templates).toBe(2);
  expect(result.series.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -w @coraza/api -- --testPathPattern=monthly-scheduling --no-cache`  
Expected: FAIL (method missing) or suite missing until file created.

- [ ] **Step 3: Implement `overview` sequentially**

```ts
async overview(year: number, month: number) {
  const schedules = await this.listByMonth({ year, month });
  const conflicts = await this.findConflicts({ year, month });
  const templates = await this.listTemplates();
  const assignedCells = schedules.reduce((n, s) => {
    const asg = (s as { assignments?: Array<{ associateId?: string | null; jornada?: string }> }).assignments ?? [];
    return n + asg.filter((a) => a.associateId && a.jornada !== 'sin_asignar').length;
  }, 0);
  // build series from conflicts by postId (need post code/name from schedules.post)
  // ...
  return { year, month, kpis: { postsInMonth: schedules.length, assignedCells, conflicts: conflicts.length, templates: templates.length }, series };
}
```

- [ ] **Step 4: Add controller route BEFORE parameterized routes if any**

```ts
@Get('overview')
@RequirePermissions('scheduling.view')
overview(@Query() query: ListMonthlyScheduleDto) {
  return this.service.overview(query.year, query.month);
}
```

Ensure `ListMonthlyScheduleDto` validates `year` and `month` (already used by conflicts).

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm test -w @coraza/api -- --testPathPattern=monthly-scheduling --no-cache`  
Expected: PASS

- [ ] **Step 6: Commit** (when authorized)

```bash
git add apps/api/src/modules/scheduling
git commit -m "feat(scheduling): add monthly overview for programacion panel"
```

---

### Task 3: Programación panel + routes

**Files:**
- Modify: `apps/web/src/app/features/programacion/monthly-scheduling-api.service.ts`
- Create: `apps/web/src/app/features/programacion/programacion-panel/programacion-panel.ts`
- Modify: `apps/web/src/app/features/programacion/programacion-layout/programacion-layout.ts`
- Modify: `apps/web/src/app/app.routes.ts` (programacion children)

**Interfaces:**
- Consumes: `GET /scheduling/monthly/overview?year=&month=`
- Produces: default route `/programacion` → panel

- [ ] **Step 1: Add API client method**

```ts
getMonthlyOverview(year: number, month: number) {
  return this.http.get<ProgramacionOverview>(`${this.api}/scheduling/monthly/overview`, {
    params: { year, month },
  });
}
```

Define `ProgramacionOverview` type matching Task 2 payload (same file or small types file).

- [ ] **Step 2: Create `ProgramacionPanel`**

- Use current year/month (local date).
- `StatsKpiGrid` with 4 items linking to `/programacion/matriz` or `/programacion/cuadro`.
- `StatsMiniBars` title `"Conflictos / carga por puesto"` bound to `series`.
- loading / error signals; inline error string on failure.
- Import `StatsKpiGrid`, `StatsMiniBars`.

- [ ] **Step 3: Update layout nav**

```ts
{ label: 'Panel', route: '/programacion', permission: 'scheduling.view', icon: LucideLayoutDashboard, exact: true },
// existing Matriz + Cuadro
```

- [ ] **Step 4: Update routes**

```ts
{ path: '', pathMatch: 'full', redirectTo: 'panel' },
{
  path: 'panel',
  canActivate: [permissionGuard],
  data: { permission: 'scheduling.view' },
  loadComponent: () =>
    import('./features/programacion/programacion-panel/programacion-panel').then((m) => m.ProgramacionPanel),
},
// matriz, cuadro unchanged
```

- [ ] **Step 5: Manual verify**

Run API + web locally; open `/programacion` as user with `scheduling.view`.  
Expected: panel KPIs load; Matriz still works from nav.

- [ ] **Step 6: Commit** (when authorized)

```bash
git add apps/web/src/app/features/programacion apps/web/src/app/app.routes.ts
git commit -m "feat(programacion): add stats panel as default route"
```

---

### Task 4: Users overview API

**Files:**
- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/users/users.controller.ts`
- Create/Modify: `apps/api/src/modules/users/users.service.spec.ts` (or overview-focused spec)

**Interfaces:**
- Produces:

```ts
async overview(): Promise<{
  kpis: { usersActive: number; usersInactive: number; roles: number };
  recentUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    roleName: string;
    isActive: boolean;
    createdAt: string;
  }>;
}>
```

Implementation (sequential):

1. `COUNT` active / inactive (two queries or one `GROUP BY is_active`).
2. `rolesRepo.count()`.
3. `find` recent users `ORDER BY createdAt DESC TAKE 8` with role relation.

- [ ] **Step 1: Failing test**

```ts
it('overview returns active/inactive counts and recent users', async () => {
  // mock counts + recent list
  const r = await service.overview();
  expect(r.kpis.usersActive + r.kpis.usersInactive).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(r.recentUsers)).toBe(true);
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npm test -w @coraza/api -- --testPathPattern=users.service --no-cache`

- [ ] **Step 3: Implement service + controller**

Register **before** any `@Get(':id/...')`**:

```ts
@Get('overview')
@RequirePermissions('users.view')
overview() {
  return this.usersService.overview();
}
```

Inject `Roles` repository or use existing `rolesRepo` if already in `UsersService` (it already loads roles for create — reuse that repo).

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit** (when authorized)

```bash
git add apps/api/src/modules/users
git commit -m "feat(users): add overview stats for admin panel"
```

---

### Task 5: Admin panel + routes

**Files:**
- Create: `apps/web/src/app/features/admin/admin-panel/admin-panel.ts`
- Create or modify API helper under `apps/web/src/app/features/admin/` (check existing users list service; add `getOverview()` there)
- Modify: `apps/web/src/app/features/admin/admin-layout/admin-layout.ts`
- Modify: `apps/web/src/app/app.routes.ts` (admin children)

- [ ] **Step 1: Client `getUsersOverview()`** → `GET ${api}/users/overview`

- [ ] **Step 2: `AdminPanel` component**

- `StatsKpiGrid`: Activos, Inactivos, Roles (Roles card `link` only if `auth.hasPermission('roles.view')` → `/admin/roles`; users cards → `/admin/usuarios`).
- Short list (inline table OK): `recentUsers` with name, email, role, active badge.
- No “Crear usuario” button without `users.create`.

- [ ] **Step 3: Layout nav** — Panel first with `exact: true` on `/admin`.

- [ ] **Step 4: Routes**

```ts
{ path: '', pathMatch: 'full', redirectTo: 'panel' },
{
  path: 'panel',
  canActivate: [permissionGuard],
  data: { permission: 'users.view' },
  loadComponent: () =>
    import('./features/admin/admin-panel/admin-panel').then((m) => m.AdminPanel),
},
// usuarios, roles unchanged
```

- [ ] **Step 5: Manual verify** as Gerencia and as Auditor (`users.view` / `roles.view` only).

- [ ] **Step 6: Commit** (when authorized)

```bash
git add apps/web/src/app/features/admin apps/web/src/app/app.routes.ts
git commit -m "feat(admin): add stats panel as default route"
```

---

### Task 6: Phase 2 — Dotación panel adopts shared components

**Files:**
- Modify: `apps/web/src/app/features/dotacion/dotacion-panel/dotacion-panel.ts`

- [ ] Replace hand-rolled KPI grid markup with `<app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()">` keeping same metrics and links.
- [ ] Keep existing secondary sections (recent deliveries / reports) as-is.
- [ ] Manual: `/dotacion` still loads overview.
- [ ] Commit when authorized: `feat(dotacion): adopt shared stats KPI grid on panel`

---

### Task 7: Phase 2 — Recepción panel adopts shared components

**Files:**
- Modify: `apps/web/src/app/features/reception/reception-panel/reception-panel.ts`

- [ ] Map `stats` → `StatsKpiGrid` items (insideNow, today, month, year).
- [ ] Map `last14Days` → `StatsMiniBars` (`key/label=day`, `value=entries`).
- [ ] Keep “Dentro ahora” / “Hoy” tables.
- [ ] Commit when authorized: `feat(recepcion): adopt shared stats components on panel`

---

### Task 8: Phase 2 — Documental panel adopts shared components

**Files:**
- Modify: `apps/web/src/app/features/documental/documental-panel/documental-panel.ts`

- [ ] Map analytics counts → `StatsKpiGrid` (6 KPIs) with links to corresponding documental routes.
- [ ] Keep alerts table as short list under the grid.
- [ ] Commit when authorized: `feat(documental): adopt shared stats KPI grid on panel`

---

### Task 9: Phase 2 — RRHH visual polish

**Files:**
- Modify: `apps/web/src/app/features/rrhh/hr-dashboard/hr-dashboard.ts` (minimal)

- [ ] Swap only the top KPI row to `StatsKpiGrid` if low-risk; **do not** rewrite rotation/demographics logic.
- [ ] If swap is awkward (many permission-specific cards), leave KPIs and only align CSS class names / spacing to match shared grid — document choice in commit message.
- [ ] Commit when authorized: `refactor(rrhh): align panel KPI presentation with shared stats`

---

### Task 10: Verification gate

- [ ] Local: login Gerencia → open Programación, Admin, Dotación, Recepción, Documental, RRHH panels — each shows KPIs without server alert.
- [ ] Local: login Auditor → same panels visible; no create/edit CTAs.
- [ ] API: `GET /scheduling/monthly/overview?year=2026&month=8` and `GET /users/overview` → 200.
- [ ] Run: `npm test -w @coraza/api -- --testPathPattern='monthly-scheduling|users.service' --no-cache`
- [ ] Run: `graphify update .` after code changes.
- [ ] Push/PR only when JHON asks.

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Shared StatsKpiGrid + MiniBars | Task 1 |
| Programación overview API sequential | Task 2 |
| Programación panel + default route | Task 3 |
| Admin users overview API | Task 4 |
| Admin panel + default route | Task 5 |
| Phase 2 Dotación / Recepción / Documental | Tasks 6–8 |
| RRHH visual alignment only | Task 9 |
| Permissions / Auditor | Tasks 3, 5, 10 |
| No global dashboard redesign | (non-goal, omitted) |
| Avoid pool exhaustion | Tasks 2, 4 (sequential) |

## Placeholder scan

No TBD/TODO left in task steps; payloads and routes are explicit.
