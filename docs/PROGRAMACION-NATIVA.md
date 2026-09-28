# Programación nativa en Portal Coraza

**Fecha:** 2026-08-03  
**Actualizado:** 2026-09-28  
**Fuente de verdad de negocio:** [APP-CONTABILIDAD](https://github.com/freidercao-spec/APP-CONTABILIDAD) (CONTROL DE PUESTOS)  
**Grafo:** `../APP-CONTABILIDAD/graphify-out/` (Graphify, code-only)

## Handoff (2026-09-02) — continuar en otro PC

Commit de código: `b1261aa` `fix(programacion): quitar Matriz de Turnos`.

**Hecho:** se eliminó el submódulo **Matriz de Turnos** (`/programacion/matriz`, `master-grid.ts`). Bajaba el mes entero (`listByMonth`) y pintaba una tabla de todos los puestos × días; saturaba el pool de Supabase (máx. 5) y el navegador. El **Cuadro** por puesto cubre la operación.

**No recrear** `master-grid` ni la ruta `programacion/matriz`.

**Queda en el menú:** Panel, Cuadro de Turnos, Control de Alertas, Liquidación y Recargos.

**Hecho (panel):** `reloadAll()` ya no llama `getPayrollRecargos`. Disponibilidad del panel se arma solo con `getTodayCoverage`. Recargos siguen en `/programacion/recargos`.

**Hecho (cuadro):** motor crea programación si falta; selector de puesto muestra nombre completo; titulares y celdas buscan vigilante por nombre/cédula (mín. 2 chars, 600+ asociados).

**Siguiente paso (uno a uno, un commit por cambio):** si el panel sigue pesado, serializar `getMonthlyOverview` / `getTodayCoverage` o cachear.

**No tocar** SST / documental ( Freider ). No mezclar skills locales (`.agents/skills`) en commits.

**Verificar:** `npx tsc -p tsconfig.app.json --noEmit` en `apps/web`. No `ng build` completo salvo deploy.

## Cambio (fase 1)

El botón / ruta `/programacion` **ya no abre** GitHub Pages (`freidercao-spec.github.io/APP-CONTABILIDAD`).  
Programación corre **dentro del portal**: Angular + NestJS + Supabase.

Documental sigue como puente externo.

## Ruta completa

| Capa | Ubicación |
|------|-----------|
| UI | `apps/web/src/app/features/programacion/` |
| Rutas | `apps/web/src/app/app.routes.ts` → `ProgramacionLayout` → `cuadro` |
| API | `apps/api/src/modules/scheduling/` |
| Motor | `motor-turnos.service.ts` (4 ciclos, paridad APP) |
| SQL | `009_monthly_scheduling.sql` |

## Lógica de negocio (desde APP-CONTABILIDAD)

### Entidades

```
Puesto (posts) ── Programación mensual (monthly_schedules)
                    ├── personal JSONB (roles: titular_a, titular_b, relevante…)
                    └── schedule_assignments (día × rol → D/N/R/NR/VAC/…)
Asociado (associates) ←── associate_id en celdas y personal
```

Mes en Portal: **1–12** (APP usaba 0–11).

### Motor de turnos (ciclos)

| Ciclo | Días | Patrón |
|-------|------|--------|
| `12x3` (default) | 15 | 6D → 6N → 2R → 1NR |
| `10x5` | 15 | 5D → 5N → 2R → 3NR |
| `2x2` | 6 | 2D → 2N → 2NR |
| `13x2` | 30 | 13D → 2R → 13N → 2R |

| Código | Significado | Horario |
|--------|-------------|---------|
| `D` | Diurno 12 h | 06:00–18:00 |
| `N` | Nocturno 12 h | 18:00–06:00 |
| `D8` | Diurno 8 h | 06:00–14:00 |
| `N8` | Nocturno 8 h | 22:00–06:00 |

El motor de ciclo (12×3, etc.) genera **D/N 12 h**. `D8`/`N8` se asignan a mano en la celda. Para cobertura, D8 cuenta como diurno y N8 como nocturno.

**Invariantes:**
1. Ciclo **continuo entre meses** (posición del día 1 = última del mes anterior + 1).
2. Cambios manuales de celda permitidos (sin cascada automática).
3. Validaciones: cobertura D/N, doble descanso, >6 consecutivos D o N.
4. Rol **relevante***: no lleva ciclo propio; solo cubre huecos D/N que dejan los titulares ese día (resto NR = libre en ese puesto para otro).

Fuente original: `APP-CONTABILIDAD/src/store/motorTurnos.ts`.

### God nodes del grafo (Graphify)

1. `useVigilanteStore` / `usePuestoStore` / `useProgramacionStore`
2. `GestionPuestos.tsx` / `PanelMensualPuesto`
3. `motorTurnos.ts` / `AsignacionDia` / `ProgramacionMensual`

Abrir `../APP-CONTABILIDAD/graphify-out/graph.html` para explorar.

## Qué ya está en el portal (fase 1–3)

- [x] Ruta nativa `/programacion` (sin bridge externo)
- [x] Cuadro mensual por puesto (`schedule-board`)
- [x] Motor con **4 ciclos** + selector UI
- [x] Continuidad mes→mes al aplicar motor
- [x] Alertas de validación del motor (en respuesta de `/motor`)
- [x] Save atómico TypeORM + publish + notificación GERENCIA
- [x] Festivos Colombia en el cuadro
- [x] Conflictos cross-puesto (`GET /scheduling/monthly/conflicts`)
- [x] Motor por puesto en el cuadro (`POST /scheduling/monthly/:id/motor`)
- [x] Plantillas básicas (`GET/POST templates`, `POST :id/apply-template/:templateId`) + UI en cuadro
- [x] **Retirado 2026-09-02:** MasterGrid `/programacion/matriz` (pesado; no se vuelve a montar)

## Reglas del cuadro y Estado de Vigilantes (2026-09-28)

Las 4 reglas del módulo: todos los puestos cubiertos, sin vigilantes repetidos, mínimo de horas y máximo de horas por asociado (sumando **todos** sus puestos).

**Parámetros** — por tenant en `scheduling_settings` (migración `075`), editables por GERENCIA/ADMIN en
Estado de Vigilantes → "Cambiar reglas" (`GET/PUT /scheduling/monthly/settings`). Sin tabla o sin fila se usan
los valores por defecto de `DEFAULT_SCHEDULING_RULES` (`monthly-alerts.compute.ts`).

| Regla | Valor | Nota |
|-------|-------|------|
| Mínimo | 210 h/mes | Jornada ordinaria 42 h/sem (Ley 2101, jul-2026). Baja en proporción a días con novedad (VAC/IN/LC/SP/AC). |
| Máximo | 288 h/mes | 24 turnos de 12 h (tope histórico del portal). |
| Descanso mínimo | 8 h | Entre fin de un turno y el inicio del siguiente, en cualquier puesto. |
| Sin uso | > 15 días sin turno | |

**Horario real por código** (`SHIFT_HOURS`): D/D12 06–18, N/N12 18–06, D8 06–14, N8 22–06, N10 20–06, D9 06–15*, N9 21–06*, 24H.
Cruces y descansos se calculan con este horario (cruza medianoche), no por franja D/N. *D9/N9 asumidos: no tienen horario en la UI.

**Alertas** (`computeMonthlyAlerts`)

| Tipo | Severidad | Regla |
|------|-----------|-------|
| `hueco_cobertura` | error | Falta D y/o N; o puesto activo sin cuadro |
| `asociado_inactivo` | error | Novedad en celda o status ≠ ACTIVO en turno |
| `ausencia_rrhh` | error | Programado en días con ausencia registrada en Ausentismo (`associate_absences`, solo lectura) |
| `conflicto_mismo_turno` | error | Turnos de la misma persona que se cruzan en horario (también 2 roles del mismo puesto) |
| `descanso_insuficiente` | error | Menos del descanso mínimo entre turnos (p. ej. D en un puesto + N en otro = 24 h seguidas) |
| `carga_sobre_24` | error | Id histórico: horas del mes **sobre el máximo** (todos los códigos) |

El KPI "Conflictos" del panel usa la misma regla (cruces + sin descanso).
En Control de Alertas, "Ya la revisé, no aplica" guarda la alerta en `schedule_alert_dismissals` con motivo
(`POST /scheduling/monthly/alerts/dismiss`, auditado) y deja de mostrarse. No afecta el bloqueo al guardar ni al publicar.
El caché de reportes (45 s) va separado por tenant.

**Guardar (`PUT /:id`)**
- **Bloquea** (409 `SCHEDULING_BLOCKED`, `confirmWarnings` no lo salta): cruces, sin descanso y no activo en turno, en días abiertos.
- **Confirma** (409 `SCHEDULING_WARNINGS`): sobre el máximo; cambios en días ya trabajados (`edicion_dia_pasado`). Lo aceptado y el antes→después de días pasados queda en auditoría.
- Días cerrados = antes de hoy (Bogotá). No bloquean: las novedades y reemplazos se registran después.

**Publicar (`PATCH /:id/status`)** — con huecos, cruces o no disponibles responde 409 `PUBLISH_BLOCKED`. GERENCIA/ADMIN pueden publicar con `justificacion` (≥ 10 caracteres, queda en auditoría y en la notificación).

**Motor** — conserva días cerrados; con `roles` filtrados conserva las celdas de los demás roles; mes pasado → 400.
**Copiar al resto del año** — si un mes choca con otros puestos, se salta y se informa en `skipped`.

**Estado de Vigilantes** — `/programacion/vigilantes`, `GET /scheduling/monthly/associates-status?year&month` (`associate-status.compute.ts`).
Horas por asociado ACTIVO (todos los puestos), estado (en rango / bajo mínimo / sobre máximo / sin programar / con novedad), capacidad (roles de los cuadros vs activos), relevantes, días sin turno y **sugerencias**: reparte los huecos de días abiertos entre quienes están bajo el mínimo (más faltante primero, prioriza sus puestos, respeta cruces, descanso, máximo y novedades; cada hueco a una sola persona). Export CSV.
El panel "Disponibles" del cuadro y las horas por titular usan este mismo endpoint (reemplaza `pool-disponibles`, eliminado).

## Pendiente (paridad con APP — fases siguientes)

- [ ] Historial de cambios rico / auditoría de celdas (hoy: antes→después de días pasados en auditoría del save)
- [ ] Offline queue + realtime (Zustand APP)
- [ ] Escribir novedades LC/SP/IN/AC en ausentismo RRHH (hoy solo se **lee** Ausentismo para alertar)
- [x] `scheduling_settings` por tenant + descartar alertas con motivo — **aplicar migración 075** en cada entorno
- [ ] WhatsApp / AI (satélites; no bloquean el tablero)

## Smoke test

```powershell
npm run api:dev
npm run web:dev
```

1. Login → Dashboard → **Ir a Programación** (misma pestaña, `/programacion/panel`)
2. No debe existir pestaña **Matriz de Turnos**
3. Abrir cuadro de un puesto → Aplicar motor / editar celdas → Guardar
4. En cuadro: **Guardar como plantilla** / aplicar plantilla existente
5. Publicar → No debe abrirse GitHub Pages

## Graphify (herramienta)

Instalado en el monorepo Portal Coraza:

- CLI: `uv tool install graphifyy` → `graphify`
- Cursor rule: `.cursor/rules/graphify.mdc`
- Skill: `.cursor/skills/graphify/SKILL.md`

Grafo del producto APP (código fuente limpio):

```powershell
cd ..\APP-CONTABILIDAD
$env:PATH = "$env:USERPROFILE\.local\bin;$env:PATH"
graphify src --code-only
graphify cluster-only src
# salida: graphify-out/graph.html + GRAPH_REPORT.md
```
