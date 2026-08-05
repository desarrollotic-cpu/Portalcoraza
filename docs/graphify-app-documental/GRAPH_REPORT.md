# Graph Report - .  (2026-08-05)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 301 nodes · 440 edges · 28 communities (22 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02a66a7d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26

## God Nodes (most connected - your core abstractions)
1. `apiCall()` - 36 edges
2. `cargarTodoElSistema()` - 15 edges
3. `showSection()` - 12 edges
4. `cargarBiblioteca()` - 10 edges
5. `cargarPrestamos()` - 9 edges
6. `cargarCorrespondencia()` - 8 edges
7. `main()` - 7 edges
8. `cargarPersonal()` - 7 edges
9. `ejecutarBusqueda()` - 7 edges
10. `cargarDashboard()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `apiCall()` --calls--> `cerrarSesion()`  [EXTRACTED]
  frontend/app.js → frontend/app.js  _Bridges community 1 → community 0_

## Import Cycles
- None detected.

## Communities (28 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (51): abrirModalColaImpresion(), actualizarBadgeCola(), actualizarSeriesTRD(), agregarAColaImpresion(), buscarPersonal(), cacheArbol, cambiarEstadoFila(), cambiarPaginaPers() (+43 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (39): abrirEscanerCamaraQR(), actualizarNotificacionesSistema(), apiCall(), aplicarPermisosPorRol(), aprobarSolicitudPrestamo(), busquedaInstantanea(), cargarBiblioteca(), cargarContratos() (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): author, dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, pg (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (15): DATA_DIR, fs, getJsonData(), path, { Pool }, query(), saveJsonData(), app (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (20): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, pg, description (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.27
Nodes (16): excelDateToDate(), genId(), importados, importarContratos(), importarCorrespondencia(), importarMinutas(), importarPersonal(), importarPrestamos() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.27
Nodes (9): excelDateToDate(), genId(), leerHoja(), main(), mainFile, minutasFile, path, { Pool } (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.32
Nodes (7): excelDateToString(), fs, isValidCalendarDate(), path, { Pool }, reindexContratos(), XLSX

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): mainFile, minutasFile, path, wbMain, wbMinutas, XLSX

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (6): data, mainFile, path, rows, wb, XLSX

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (6): destJpg, destPng, fs, path, srcOriginalJpg, srcOriginalPng

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (5): contratos, contratosFile, fs, path, { Pool }

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (5): mainFile, minutasFile, path, { Pool }, XLSX

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): filePath, fs, path, workbook, xlsx

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (5): destFolder, destJpg, destPng, fs, path

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (4): data, { Pool }, wb, XLSX

### Community 16 - "Community 16"
Cohesion: 0.33
Nodes (5): destJpg, destPng, fs, path, srcHdPng

### Community 17 - "Community 17"
Cohesion: 0.40
Nodes (3): fs, path, { Pool }

### Community 18 - "Community 18"
Cohesion: 0.40
Nodes (3): { Pool }, wb, XLSX

### Community 19 - "Community 19"
Cohesion: 0.50
Nodes (3): folders, fs, path

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): builds, routes, version

## Knowledge Gaps
- **122 isolated node(s):** `{ Pool }`, `fs`, `path`, `xlsx`, `filePath` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiCall()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `{ Pool }`, `fs`, `path` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05336538461538461 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0931174089068826 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09956709956709957 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._