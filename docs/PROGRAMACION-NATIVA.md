# Programación nativa en Portal Coraza

**Fecha:** 2026-08-03  
**Fuente de verdad de negocio:** [APP-CONTABILIDAD](https://github.com/freidercao-spec/APP-CONTABILIDAD) (CONTROL DE PUESTOS)  
**Grafo:** `../APP-CONTABILIDAD/graphify-out/` (Graphify, code-only)

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

**Invariantes:**
1. Ciclo **continuo entre meses** (posición del día 1 = última del mes anterior + 1).
2. Cambios manuales de celda permitidos (sin cascada automática).
3. Validaciones: cobertura D/N, doble descanso, >6 consecutivos D o N.

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
- [x] **MasterGrid** multi-puesto (`/programacion/matriz`) + filtro por tipo
- [x] Festivos Colombia en matriz y cuadro
- [x] Conflictos cross-puesto (`GET /scheduling/monthly/conflicts`)
- [x] Motor global del mes (`POST /scheduling/monthly/motor-global`) + UI en matriz
- [x] Plantillas básicas (`GET/POST templates`, `POST :id/apply-template/:templateId`) + UI en cuadro

## Pendiente (paridad con APP — fases siguientes)

- [ ] Historial de cambios rico / auditoría de celdas
- [ ] Offline queue + realtime (Zustand APP)
- [ ] Estados novedad LC/SP/IN/AC → ausentismo RRHH
- [ ] WhatsApp / AI (satélites; no bloquean el tablero)

## Smoke test

```powershell
npm run api:dev
npm run web:dev
```

1. Login → Dashboard → **Ir a Programación** (misma pestaña, `/programacion`)
2. Matriz: elegir ciclo → **Motor global** (o crear faltantes + motor)
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
