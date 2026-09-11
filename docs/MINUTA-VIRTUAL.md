# Minuta Virtual — estado actual

> **Última actualización:** 2026-09-11  
> App de campo para vigilantes (rol `PUESTO`). No vive en el menú del Portal.

## Apps y URLs

| Pieza | Ubicación / URL |
|-------|-----------------|
| App vigilante | `apps/minuta-web` → https://portalcoraza-minuta.onrender.com |
| API (compartida) | `apps/api` módulo `minuta` → https://portalcoraza.onrender.com/api/v1 |
| Supervisión ops | Portal → `/operaciones/minutas` (`apps/web/.../operaciones/minutas-list`) |
| Fichas de puestos (ops) | Portal → `/operaciones/puestos/fichas` |

## UX vigilante (minuta-web)

Pantallas: **Inicio** · **Registrar** · **Historial** (nav inferior).

- Inicio: CTA principal “Registrar entrada / novedad”, resumen del día, últimos registros.
- Registrar: tiles con etiqueta + pista corta; formularios en español cotidiano; botón grande “Guardar registro”.
- Historial: botón **Ver** (texto), **Marcar salida** / **Entregar**; estados legibles (“En el puesto”, etc.).
- Shell: muestra `Puesto · nombre` del usuario logueado; targets táctiles ≥ ~48px.

Código clave: `minuta.shared.ts`, `minuta-inicio`, `minuta-nuevo`, `minuta-historial`, `minuta-shell`.

## Reglas de negocio (resumen)

- Cuenta **PUESTO** debe estar en `user_posts` (vínculo al puesto) o el scope de minuta falla.
- Permisos: `minuta.view`, `minuta.create` (sin edición posterior; registros inmutables).
- El vigilante escribe su nombre en `registradoPor` al guardar; la hora la pone el sistema.
- Portal **no** muestra “Minuta Virtual” en el nav principal; solo Operaciones (PDF/historial por puesto).
- En Operaciones → Minutas: buscador de puestos, enlace copiable a Minuta Web, listado de cuentas PUESTO activas.

## Deploy / CORS

Ver `docs/MINUTA-WEB-DEPLOY-HANDOFF.md` y `docs/DEPLOY-RENDER.md`.

`CORS_ORIGIN` debe incluir portal + minuta.

## Docs históricas (diseño / planes)

- `docs/superpowers/specs/2026-08-28-minuta-app-separada-design.md`
- `docs/superpowers/plans/2026-08-28-minuta-app-separada.md`
- Specs/planes 2026-08-12 / 08-19 (minuta completa, rol PUESTO, ops minutas)

## Grafo

Tras cambios de septiembre 2026: `graphify update . --force` → `graphify-out/` (ignorado por git). Consultar con `graphify query "..."`.
