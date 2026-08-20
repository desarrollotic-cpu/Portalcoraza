# Programación Alertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel de alertas en Programación (pestañas) + colores en tablero + popups al asignar, calculados en API al vuelo (huecos D/N, inactivos, conflictos mismo día/turno, carga >24 turnos 12h).

**Architecture:** Función pura `computeMonthlyAlerts` (testeable) + `MonthlySchedulingService.getAlerts` carga asignaciones del mes (join posts/associates) y aplica la función. Endpoints `GET .../alerts` y `GET .../alerts/board`. `PUT :id` exige `confirmWarnings` si hay inactivo/conflicto en el payload. Front: ruta `/programacion/alertas`, pinta celdas, reutiliza `ConfirmDialog`.

**Tech Stack:** NestJS + TypeORM + Jest (API); Angular standalone + signals (web); permisos `scheduling.view` / `scheduling.edit`.

## Global Constraints

- Cobertura: cada puesto/día necesita franja diurna y nocturna (`D`/`D8` y `N`/`N8` vía `MotorTurnosService.isDayCode` / `isNightCode`).
- Celda con asociado `status !== ACTIVO` **no cuenta** como cobertura (queda hueco a cubrir) y genera `asociado_inactivo`.
- Conflicto: mismo `associateId`, mismo `day`, misma franja (ambos day-code o ambos night-code) en **distintos** `postId`. `D` en un puesto y `N` en otro el mismo día **no** es conflicto.
- Carga >24: contar solo códigos exactos `D` y `N` (no `D8`/`N8`) en **todos** los puestos del mes; severidad `warning`; no bloquea.
- `scope=auto`: si `month` es el mes actual (Bogotá) y día ≥ 20, incluir también alertas del mes siguiente en la respuesta (campo `months` o lista unificada con `month` por ítem).
- Sin tabla persistente de alertas. Sin auto-reasignación.
- Auditor / gerente / director: solo `scheduling.view` — ven panel y colores; no editan.
- Reutilizar `app-confirm-dialog` (no `window.confirm` nuevo).
- Ampliar/reemplazar uso de `GET .../conflicts` en UI de alertas; el endpoint viejo puede quedar para el panel KPI hasta alinear overview (opcional en Task 6).

## File map

| File | Responsibility |
|------|----------------|
| Create: `apps/api/src/modules/scheduling/monthly-alerts.compute.ts` | Tipos + `computeMonthlyAlerts` pura |
| Create: `apps/api/src/modules/scheduling/monthly-alerts.compute.spec.ts` | Tests de reglas |
| Modify: `apps/api/src/modules/scheduling/dto/monthly-scheduling.dto.ts` | Query alerts + `confirmWarnings` en save |
| Modify: `apps/api/src/modules/scheduling/monthly-scheduling.service.ts` | `getAlerts`, `getBoardAlerts`, gate en `save` |
| Modify: `apps/api/src/modules/scheduling/monthly-scheduling.controller.ts` | GET alerts / alerts/board |
| Modify: `apps/api/src/modules/scheduling/scheduling.module.ts` | Solo si hace falta `Associate` en TypeOrmModule |
| Modify: `apps/web/.../monthly-scheduling-api.service.ts` | Client types + métodos |
| Create: `apps/web/.../programacion-alertas/programacion-alertas.ts` | Pantalla pestañas |
| Modify: `apps/web/.../programacion-layout/programacion-layout.ts` | Nav Alertas |
| Modify: `apps/web/src/app/app.routes.ts` | Ruta `alertas` |
| Modify: `apps/web/.../schedule-board/schedule-board.ts` | Colores + popup + confirmWarnings |
| Modify: `apps/web/.../master-grid/master-grid.ts` | Colores/conflictos desde alerts (mínimo: badge + link) |

---

### Task 1: Calculador puro de alertas (TDD)

**Files:**
- Create: `apps/api/src/modules/scheduling/monthly-alerts.compute.ts`
- Create: `apps/api/src/modules/scheduling/monthly-alerts.compute.spec.ts`

**Interfaces:**
- Produces:
```ts
export type AlertType =
  | 'hueco_cobertura'
  | 'asociado_inactivo'
  | 'conflicto_mismo_turno'
  | 'carga_sobre_24';

export type AlertSeverity = 'error' | 'warning';

export interface AlertCellInput {
  postId: string;
  postName: string;
  day: number;
  role: string;
  associateId: string | null;
  associateName: string | null;
  associateStatus: 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO' | 'VACACIONES' | 'RETIRADO' | null;
  codigo: string | null;
}

export interface ScheduleAlertItem {
  id: string; // estable: `${type}:${month}:${postId}:${day}:${shift|associateId}`
  type: AlertType;
  severity: AlertSeverity;
  month: string; // YYYY-MM
  day?: number;
  postId: string;
  postName: string;
  associateId?: string;
  associateName?: string;
  shift?: 'D' | 'N';
  otherPostId?: string;
  otherPostName?: string;
  message: string;
}

export function computeMonthlyAlerts(args: {
  month: string; // YYYY-MM
  daysInMonth: number;
  cells: AlertCellInput[];
}): ScheduleAlertItem[];
```

- Helpers internos (misma paridad que motor): `isDayCode` / `isNightCode` / `isTwelveHourCode` (`codigo === 'D' \|\| codigo === 'N'`).

- [ ] **Step 1: Write failing tests**

```ts
// monthly-alerts.compute.spec.ts
import { computeMonthlyAlerts } from './monthly-alerts.compute';

describe('computeMonthlyAlerts', () => {
  const base = { month: '2026-08', daysInMonth: 31 };

  it('hueco cuando falta D (sin day-code activo)', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1', postName: 'Puesto 1', day: 1, role: 'vigilante_1',
          associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO', codigo: 'N',
        },
      ],
    });
    expect(alerts.some((a) => a.type === 'hueco_cobertura' && a.day === 1 && a.shift === 'D')).toBe(true);
  });

  it('asociado_inactivo + no cuenta cobertura', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1', postName: 'Puesto 1', day: 2, role: 'vigilante_1',
          associateId: 'a1', associateName: 'Ana', associateStatus: 'VACACIONES', codigo: 'D',
        },
        {
          postId: 'p1', postName: 'Puesto 1', day: 2, role: 'vigilante_2',
          associateId: 'a2', associateName: 'Bob', associateStatus: 'ACTIVO', codigo: 'N',
        },
      ],
    });
    expect(alerts.some((a) => a.type === 'asociado_inactivo')).toBe(true);
    expect(alerts.some((a) => a.type === 'hueco_cobertura' && a.day === 2 && a.shift === 'D')).toBe(true);
  });

  it('conflicto mismo día y misma franja en dos puestos', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1', postName: 'Amisi', day: 3, role: 'vigilante_1',
          associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO', codigo: 'D',
        },
        {
          postId: 'p2', postName: 'Otro', day: 3, role: 'vigilante_1',
          associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO', codigo: 'D',
        },
      ],
    });
    const c = alerts.find((a) => a.type === 'conflicto_mismo_turno');
    expect(c?.message).toMatch(/Otro|Amisi/);
    expect(c?.otherPostName).toBeTruthy();
  });

  it('D en un puesto y N en otro el mismo día NO es conflicto', () => {
    const alerts = computeMonthlyAlerts({
      ...base,
      cells: [
        {
          postId: 'p1', postName: 'Amisi', day: 3, role: 'vigilante_1',
          associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO', codigo: 'D',
        },
        {
          postId: 'p2', postName: 'Otro', day: 3, role: 'relevante',
          associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO', codigo: 'N',
        },
      ],
    });
    expect(alerts.filter((a) => a.type === 'conflicto_mismo_turno')).toHaveLength(0);
  });

  it('carga_sobre_24 solo con D/N; D8 no suma', () => {
    const cells = [];
    for (let day = 1; day <= 24; day++) {
      cells.push({
        postId: 'p1', postName: 'P1', day, role: 'v1',
        associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO' as const, codigo: 'D',
      });
    }
    cells.push({
      postId: 'p2', postName: 'P2', day: 25, role: 'v1',
      associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO' as const, codigo: 'D',
    });
    cells.push({
      postId: 'p2', postName: 'P2', day: 26, role: 'v1',
      associateId: 'a1', associateName: 'Ana', associateStatus: 'ACTIVO' as const, codigo: 'D8',
    });
    const alerts = computeMonthlyAlerts({ ...base, cells });
    const carga = alerts.find((a) => a.type === 'carga_sobre_24' && a.associateId === 'a1');
    expect(carga).toBeTruthy();
    expect(carga?.severity).toBe('warning');
    expect(carga?.message).toMatch(/25/);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd apps/api && npx jest src/modules/scheduling/monthly-alerts.compute.spec.ts --no-cache`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `computeMonthlyAlerts`**

Algoritmo mínimo:
1. Agrupar celdas por `postId+day`. Cobertura activa = day/night code con `associateStatus === 'ACTIVO'` (o sin associate pero con código work — tratar sin associate como no cobertura).
2. Si falta day → `hueco_cobertura` shift `D`; si falta night → shift `N`.
3. Cada celda work con status ≠ ACTIVO → `asociado_inactivo`.
4. Map `(associateId, day, fringe)` → lista de posts; si >1 post → emitir `conflicto_mismo_turno` (un ítem por par o uno por celda con `otherPostName`).
5. Contar `D`/`N` por associateId; si >24 → `carga_sobre_24`.

- [ ] **Step 4: Run tests — expect PASS**

Run: same command. Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/scheduling/monthly-alerts.compute.ts apps/api/src/modules/scheduling/monthly-alerts.compute.spec.ts
git commit -m "feat(scheduling): calculador de alertas mensuales (huecos, inactivos, conflictos, carga)"
```

---

### Task 2: API `GET /scheduling/monthly/alerts`

**Files:**
- Modify: `apps/api/src/modules/scheduling/dto/monthly-scheduling.dto.ts`
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.service.ts`
- Modify: `apps/api/src/modules/scheduling/monthly-scheduling.controller.ts`
- Modify: `apps/api/src/modules/scheduling/scheduling.module.ts` (añadir `Associate` a `TypeOrmModule.forFeature` si el servicio lo inyecta)

**Interfaces:**
- Consumes: `computeMonthlyAlerts`
- Produces: `MonthlySchedulingService.getAlerts({ year, month, scope })` →
```ts
{
  generatedAt: string;
  months: string[]; // p.ej. ['2026-08'] o ['2026-08','2026-09']
  totals: { huecos: number; inactivos: number; conflictos: number; carga: number };
  alerts: ScheduleAlertItem[];
}
```

- [ ] **Step 1: DTO query**

```ts
export class MonthlyAlertsQueryDto {
  @Type(() => Number) @IsInt() @Min(2000) @Max(2100) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @IsOptional() @IsIn(['current', 'next', 'auto'])
  scope?: 'current' | 'next' | 'auto'; // default 'auto'
}
```

- [ ] **Step 2: Cargar celdas del mes**

En service: query assignments join schedule + post + associate (leftJoin) filtrando `s.year/month`. Mapear a `AlertCellInput[]`. `daysInMonth = new Date(year, month, 0).getDate()`.

Para `scope=auto`: usar fecha Bogotá (mismo patrón que `getTodaySnapshot`). Si `year/month` es mes actual y `day >= 20`, también cargar mes siguiente y concatenar alerts (cada ítem ya trae `month`).

- [ ] **Step 3: Controller**

```ts
@Get('alerts')
@RequirePermissions('scheduling.view')
getAlerts(@Query() query: MonthlyAlertsQueryDto) {
  return this.service.getAlerts(query);
}
```

**Importante:** registrar `GET alerts` **antes** de rutas `:id` (ya está bien: los GET estáticos van arriba).

- [ ] **Step 4: Smoke manual / test de integración ligero (opcional)**

Si no hay e2e: unit test del service mockeando repos (como `monthly-scheduling.overview.spec.ts`) que verifica `scope=auto` día 19 vs 20 — preferible un helper puro:

```ts
export function monthsForAlertsScope(opts: {
  scope: 'current' | 'next' | 'auto';
  year: number;
  month: number;
  todayYear: number;
  todayMonth: number;
  todayDay: number;
}): Array<{ year: number; month: number }>
```

en el mismo `monthly-alerts.compute.ts` + 2 tests (día 19 → 1 mes; día 20 + auto + mes actual → 2 meses).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/scheduling/
git commit -m "feat(scheduling): endpoint GET monthly/alerts con scope auto desde día 20"
```

---

### Task 3: API `GET /scheduling/monthly/alerts/board` + gate en `save`

**Files:**
- Modify: `dto/monthly-scheduling.dto.ts` — `confirmWarnings?: boolean` en `SaveMonthlyScheduleDto`
- Modify: `monthly-scheduling.service.ts` — `getBoardAlerts`, `save`
- Modify: `monthly-scheduling.controller.ts`

**Interfaces:**
```ts
// board response
{
  month: string;
  postId: string;
  cells: Array<{
    day: number;
    role?: string;
    types: AlertType[];
    severity: AlertSeverity; // max severity for paint
    messages: string[];
  }>;
}
```

- [ ] **Step 1: `getBoardAlerts(postId, year, month)`** — filtra alerts del post (huecos/inactivos/conflictos que toquen ese postId; carga si el associate está en alguna celda del post).

- [ ] **Step 2: En `save(id, dto, userId)`** antes de persistir:

1. Resolver `postId/year/month` del schedule.
2. Cargar resto de asignaciones del mes (otros posts) + statuses de associates referenciados en `dto.assignments` / `dto.personal`.
3. Armar `cells` = otros posts + celdas del dto (con post actual).
4. `warnings = computeMonthlyAlerts(...).filter(t => t === asociado_inactivo || conflicto_mismo_turno)` restringido a celdas tocadas por este save (o todas del post).
5. Si `warnings.length && !dto.confirmWarnings` → `throw new ConflictException({ code: 'SCHEDULING_WARNINGS', warnings })`.
6. Si confirma o no hay warnings → guardar como hoy.

- [ ] **Step 3: Controller board**

```ts
@Get('alerts/board')
@RequirePermissions('scheduling.view')
getBoardAlerts(@Query() query: /* postId + year + month */) {
  return this.service.getBoardAlerts(query);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/scheduling/
git commit -m "feat(scheduling): alerts/board y confirmWarnings al guardar cuadro"
```

---

### Task 4: Pantalla Alertas (web)

**Files:**
- Modify: `apps/web/src/app/features/programacion/monthly-scheduling-api.service.ts`
- Create: `apps/web/src/app/features/programacion/programacion-alertas/programacion-alertas.ts`
- Modify: `apps/web/src/app/features/programacion/programacion-layout/programacion-layout.ts`
- Modify: `apps/web/src/app/app.routes.ts`

- [ ] **Step 1: API client**

```ts
getAlerts(year: number, month: number, scope: 'auto' | 'current' | 'next' = 'auto')
getBoardAlerts(postId: string, year: number, month: number)
// save(..., { personal, assignments, confirmWarnings?: boolean })
```

- [ ] **Step 2: Nav + ruta**

Layout nav item: `{ label: 'Alertas', route: '/programacion/alertas', permission: 'scheduling.view', icon: LucideTriangleAlert }` (o icono ya usado en documental).

Ruta hija `path: 'alertas'` → `ProgramacionAlertas`.

- [ ] **Step 3: UI**

- Input mes (`type=month` o year+month selects como panel).
- Badges totales.
- Tabs: Huecos | Inactivos | Conflictos | Carga.
- Lista: `message`; click → `router.navigate(['/programacion/cuadro'], { queryParams: { postId, year, month } })` (si el cuadro ya soporta query; si no, solo postId y documentar).
- Sin botones de edición (vista para auditor).

Estilos: seguir `programacion-panel` / tokens `--coraza-*`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/features/programacion apps/web/src/app/app.routes.ts
git commit -m "feat(programacion): pantalla Alertas con pestañas por tipo"
```

---

### Task 5: Colores en tablero + popup al asignar/guardar

**Files:**
- Modify: `apps/web/src/app/features/programacion/schedule-board/schedule-board.ts`
- Modify: `apps/web/src/app/features/programacion/master-grid/master-grid.ts` (mínimo: mostrar totales alerts o link a `/programacion/alertas`)

- [ ] **Step 1: Cargar `getBoardAlerts` al abrir cuadro** (junto al schedule). Guardar map `day|role` → severity/types.

CSS:
- `.cell-alert-error` → hueco (rojo borde/fondo suave)
- `.cell-alert-warn` → inactivo/conflicto (ámbar)
- title/tooltip = messages join

- [ ] **Step 2: Al aplicar celda (`applyEdit` / equivalente)** si el associate elegido:
  - status ≠ ACTIVO (desde `associateMap` si trae status; si no, confiar en save gate), o
  - conflicto detectable en cliente (opcional: comparar con board alerts de otros posts vía un cache ligero),

mostrar `app-confirm-dialog` con mensaje del spec (“Este asociado está programado en el mismo turno y día en el puesto X…” / “Asociado inactivo (VACACIONES)…”). Cancelar = no aplica; Confirmar = aplica local dirty.

- [ ] **Step 3: En `save()`** enviar sin `confirmWarnings` primero; si error `SCHEDULING_WARNINGS`, abrir dialog con lista de `warnings[].message`; al confirmar reenviar con `confirmWarnings: true`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/features/programacion/
git commit -m "feat(programacion): colores de alerta en cuadro y popup al confirmar riesgos"
```

---

### Task 6: Verificación + doc status

- [ ] **Step 1:** `cd apps/api && npx jest src/modules/scheduling/monthly-alerts.compute.spec.ts --no-cache` → PASS
- [ ] **Step 2:** `cd apps/api && npx tsc -p tsconfig.build.json --noEmit` (o script del repo) → OK
- [ ] **Step 3:** Smoke UI: login con `scheduling.view`, abrir `/programacion/alertas`; con `scheduling.edit`, editar celda conflicto/inactivo.
- [ ] **Step 4:** Actualizar spec header a `Estado: Aprobado · Implementado` y `graphify update .` si el CLI está disponible.
- [ ] **Step 5: Commit docs si hubo cambio**

```bash
git add docs/superpowers/specs/2026-08-20-programacion-alertas-design.md
git commit -m "docs: marcar spec alertas Programación como implementado"
```

---

## Spec coverage check

| Spec | Task |
|------|------|
| Huecos D/N | 1, 2 |
| Inactivos + hueco | 1 |
| Conflicto mismo día/turno + mensaje puesto | 1, 5 |
| Carga >24 solo D/N multi-puesto | 1 |
| Mes siguiente desde día 20 | 2 (`monthsForAlertsScope`) |
| Panel pestañas + colores | 4, 5 |
| Popup + permitir guardar | 3, 5 |
| Auditor view-only | 4 (sin edit UI); API permisos |
| Sin auto-reasign / sin tabla | Global |

## Out of plan (YAGNI)

- Reescribir `findConflicts` SQL (overview KPI puede seguir con el viejo hasta un follow-up).
- Notificaciones push.
- Sugerir reemplazo automático.
