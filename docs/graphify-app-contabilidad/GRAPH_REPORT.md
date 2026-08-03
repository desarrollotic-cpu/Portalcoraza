# Graph Report - src  (2026-08-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 309 nodes · 778 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d0004c5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GestionPuestos.tsx
- auditStore.ts
- programacionStore.ts
- useVigilanteStore
- motorTurnos.ts
- puestoStore.ts
- App.tsx
- GuardDetailModal.tsx
- PuestoModal.tsx
- node-empty.ts
- setup_puestos_zona.mjs

## God Nodes (most connected - your core abstractions)
1. `useVigilanteStore` - 39 edges
2. `usePuestoStore` - 30 edges
3. `showTacticalToast()` - 29 edges
4. `useProgramacionStore` - 21 edges
5. `useAuthStore` - 20 edges
6. `PanelMensualPuesto()` - 15 edges
7. `useAuditStore` - 14 edges
8. `TurnoConfig` - 13 edges
9. `AsignacionDia` - 10 edges
10. `ProgramacionMensual` - 10 edges

## Surprising Connections (you probably didn't know these)
- `SupabaseDataLoader()` --calls--> `useSupabaseInit()`  [EXTRACTED]
  App.tsx → hooks/useSupabaseInit.ts
- `AppRouter()` --calls--> `useAuthStore`  [EXTRACTED]
  App.tsx → store/authStore.ts
- `SyncStatusBar()` --calls--> `useProgramacionStore`  [EXTRACTED]
  App.tsx → store/programacionStore.ts
- `syncProgramacionToDb()` --indirect_call--> `resolve()`  [INFERRED]
  store/programacionStore.ts → shims/node-empty.js
- `App()` --calls--> `useProgramacionStore`  [EXTRACTED]
  App.tsx → store/programacionStore.ts

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "GestionPuestos.tsx"
Cohesion: 0.08
Nodes (37): KpiCard(), KpiCardProps, AddTurnoForm(), Props, CoordinationPanelProps, GestionPersonalModal(), Props, GestionRolesModalProps (+29 more)

### Community 1 - "auditStore.ts"
Cohesion: 0.09
Nodes (31): AppLayout(), NavItemProps, Sidebar(), PAGE_META, Topbar(), TopbarButtonProps, MilitaryTimeInput(), MilitaryTimeInputProps (+23 more)

### Community 2 - "programacionStore.ts"
Cohesion: 0.08
Nodes (38): GuardDetailModalProps, CeldaCalendario, CeldaCalendarioProps, getStyle(), JORNADA_STYLES, EditCeldaModal(), EditCeldaModalProps, getActiveCode() (+30 more)

### Community 3 - "useVigilanteStore"
Cohesion: 0.13
Nodes (23): CoordinationPanel(), getRolPdfLabel(), PanelMensualPuestoProps, PuestoMensualOverlay(), resolveJornadaKeys(), COLORES_ROL, GestionRolesModal(), ICONOS_ROL (+15 more)

### Community 4 - "motorTurnos.ts"
Cohesion: 0.12
Nodes (26): aplicarMotorTurnos(), asignacionToValorCelda(), calcularPosicionNuevoMes(), celdaToAsignacion(), CeldaTurno, CICLO_TOTAL, COLORES_CELDA, CONFIGURACIONES_CICLOS (+18 more)

### Community 5 - "puestoStore.ts"
Cohesion: 0.13
Nodes (16): CorazaAI(), ACTION_CONFIG, PuestoDetailModalProps, EMPRESA_ID, supabase, analyzeSystemState(), calcCobertura24h(), AIAction (+8 more)

### Community 6 - "App.tsx"
Cohesion: 0.09
Nodes (19): App(), AppRouter(), Auditoria, Configuracion, Dashboard, GestionPuestos, Inteligencia, Login (+11 more)

### Community 7 - "GuardDetailModal.tsx"
Cohesion: 0.11
Nodes (14): GuardDetailModal(), TabType, TIPOS_DESCARGO, GuardModal(), GuardModalProps, RANGOS, ConfirmDialog(), ConfirmDialogProps (+6 more)

### Community 8 - "PuestoModal.tsx"
Cohesion: 0.31
Nodes (9): GeocodeResult, getPlaceIcon(), mapOSMTypeToPuestoType(), PuestoModal(), PuestoModalProps, searchGooglePlaces(), searchNominatim(), searchPhoton() (+1 more)

### Community 9 - "node-empty.ts"
Cohesion: 0.22
Nodes (3): Readable, Transform, Writable

## Knowledge Gaps
- **80 isolated node(s):** `Dashboard`, `GestionPuestos`, `Vigilantes`, `Inteligencia`, `Login` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useVigilanteStore` connect `useVigilanteStore` to `GestionPuestos.tsx`, `auditStore.ts`, `programacionStore.ts`, `puestoStore.ts`, `GuardDetailModal.tsx`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `usePuestoStore` connect `useVigilanteStore` to `GestionPuestos.tsx`, `auditStore.ts`, `programacionStore.ts`, `puestoStore.ts`, `GuardDetailModal.tsx`, `PuestoModal.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `resolve()` connect `GuardDetailModal.tsx` to `programacionStore.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `Dashboard`, `GestionPuestos`, `Vigilantes` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GestionPuestos.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07624113475177305 - nodes in this community are weakly interconnected._
- **Should `auditStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08687943262411348 - nodes in this community are weakly interconnected._
- **Should `programacionStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07678075855689177 - nodes in this community are weakly interconnected._