# Plan — Gestión Documental nativa (SGD CORAZA → Portal Coraza)

Estado: EN EJECUCIÓN · Autor: agente (para JHON) · Fecha: 2026-08-05

Fuente de verdad de negocio: `docs/GESTION-DOCUMENTAL-SGD.md` (extraída del repo
[DOCUMENTAL-](https://github.com/pbc360252-a11y/DOCUMENTAL-), grafo en `docs/graphify-app-documental/`).

Decisión de JHON: implementar **los 11 módulos completos** + **migrar datos históricos** del Excel.

## Principios (Ponytail)
- Reusar lo nativo: `auth` (JWT+roles+permisos), `audit` (`AuditService`), `notifications`
  (`NotificationsService`), storage (`supabase-storage.service`), FK a `users`.
- **NO** portar el auth de SGD ni sus backdoors. Nada de contraseña `Admin123` global.
- Convenciones del monorepo: tablas/columnas en inglés `snake_case`, PK `uuid`,
  triggers `set_updated_at`, migraciones numeradas (siguiente = `027`), permisos `documental.*`.
- Consecutivos: tabla de contadores con bloqueo transaccional (no `MAX()+forEach`).

## Alcance de módulos (mapeo)
| SGD | Nativo Portal Coraza |
|-----|----------------------|
| Correspondencia | `doc_correspondence` |
| Minutas | `doc_minutes` |
| Asociados Retirados | `doc_retired_personnel` |
| Contratos (+ workflow >1M) | `doc_contracts` + `doc_workflows` |
| Préstamos (+ solicitud pública) | `doc_loans` |
| Biblioteca (carpetas+archivos) | `doc_library_folders` + `doc_library_files` |
| TRD | `doc_retention_table` (seed 5 dependencias de ley) |
| VOXELSERA (mapa físico 4×9) | columna `voxelsera` + servicio computado |
| Búsqueda universal | servicio cross-módulo (ILIKE multi-palabra) |
| Notificaciones (vencimientos) | reusa `NotificationsService` + endpoint de alertas |
| Auditoría | reusa `AuditService` |

> Nota: se conservan las tablas genéricas existentes `document_types`/`document_records`
> (registro documental simple ya montado). La Biblioteca SGD usa las tablas nuevas.

## Fases
1. **Datos** — migración `027_documental_sgd.sql`: 9 tablas + `doc_counters` + seeds TRD +
   permisos + índices + triggers. ← *incluye contador transaccional para consecutivos*.
2. **Persistencia** — entidades TypeORM + registro en `DocumentalModule`.
3. **API** — DTOs + servicios (consecutivos, workflow >1M, ciclo préstamos con
   auto-vencimiento, borrado lógico biblioteca, búsqueda universal, mapa VOXELSERA,
   analytics, notificaciones) + controladores con permisos.
4. **Web** — feature Angular `documental` con las 11 secciones (reusar `documental-*`
   ya esbozado), servicio API, rutas internas, quitar link externo del menú.
5. **Migración de datos** — script que lee los Excel del repo (`DATOS 001/*`, `CONTRATOS/*`)
   y carga a Supabase respetando consecutivos (contratos arrancan en 399).
6. **Verificación** — `npm run api:build` + `web build` + checks de reglas clave.

## Reglas de negocio críticas a preservar (checklist)
- [ ] Radicado correspondencia: `{dep}-{serie}[.{sub}]-{año}-{0000}`, consecutivo por dependencia.
- [ ] Minuta: `MIN-{SER|VIS|COR}-{0000}`, consecutivo por tipo.
- [ ] Contrato: `CTR-{n}-{año}`, consecutivo global (base 398→399); workflow si valor > 1.000.000.
- [ ] Préstamos: estados ACTIVO/VENCIDO/DEVUELTO/PENDIENTE_APROBACION/RECHAZADO; auto-vencimiento; solicitud pública sin login (validada).
- [ ] Biblioteca: 5 carpetas semilla; borrado lógico; al borrar carpeta, archivos → RAIZ.
- [ ] VOXELSERA: estantes A=Minutas, B=Retirados, C=Contratos, D=Correspondencia; 9 slots; normalización de códigos legados.
- [ ] Búsqueda: multi-palabra AND, cada palabra en cualquier columna, sobre 5 módulos.
- [ ] Notificaciones: préstamos vencidos/≤3d, contratos ≤30d.
- [ ] Auditoría en toda escritura.
