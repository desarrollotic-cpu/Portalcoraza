# Minuta Virtual — estado actual

> **Última actualización:** 2026-10-05  
> App de campo para vigilantes (rol `PUESTO`). No vive en el menú del Portal.

## Apps y URLs

| Pieza | Ubicación / URL |
|-------|-----------------|
| App vigilante | `apps/minuta-web` → https://portalcoraza-minuta.onrender.com |
| API (compartida) | `apps/api` módulos `minuta` + `scooter-inspections` → https://portalcoraza.onrender.com/api/v1 |
| Supervisión ops | Portal → `/operaciones/minutas` |
| Inspecciones patineta (ops) | Portal → `/operaciones/patineta` |
| Fichas de puestos (ops) | Portal → `/operaciones/puestos/fichas` |

## UX vigilante (minuta-web)

Pantallas: **Inicio** · **Registrar** · **Historial** (nav inferior) · **Inspección patineta** (si aplica).

- Inicio: resumen del día, tiles de minuta; si el puesto tiene `tiene_patineta_electrica`, tile **Inspección patineta eléctrica**.
- Registrar: tiles con etiqueta + pista corta; formularios en español cotidiano; botón grande “Guardar registro”.
- Patineta (`/patineta`): checklist PESV de respuestas cerradas; nombre = sesión; fecha/hora automáticas; novedad solo si hay algún “No”.
- Historial: botón **Ver**, **Marcar salida** / **Entregar**; estados legibles.
- Shell: muestra usuario logueado; targets táctiles ≥ ~48px.

Código clave: `minuta.shared.ts`, `minuta-inicio`, `minuta-nuevo`, `minuta-historial`, `minuta-patineta`, `scooter-api.service.ts`, `minuta-shell`.

## Reglas de negocio (resumen)

- Cuenta **PUESTO** debe estar en `user_posts` (vínculo al puesto) o el scope de minuta falla.
- Permisos minuta: `minuta.view`, `minuta.create` (registros inmutables).
- Permisos patineta: `scooter.create` (también acepta quien ya tiene `minuta.create`).
- Minuta clásica: el vigilante escribe `registradoPor`; la hora la pone el sistema.
- Patineta: inspector = `fullName` de la sesión; puede diligenciar las veces que quiera.
- Portal **no** muestra “Minuta Virtual” en el nav principal; supervisión en Operaciones (minutas + patineta).

## Deploy / CORS

Ver `docs/MINUTA-WEB-DEPLOY-HANDOFF.md` y `docs/DEPLOY-RENDER.md`.

`CORS_ORIGIN` debe incluir portal + minuta.

## Docs históricas (diseño / planes)

- `docs/superpowers/specs/2026-10-05-inspeccion-patineta-electrica-design.md`
- `docs/superpowers/specs/2026-08-28-minuta-app-separada-design.md`
- `docs/superpowers/plans/2026-08-28-minuta-app-separada.md`
- Specs/planes 2026-08-12 / 08-19 (minuta completa, rol PUESTO, ops minutas)

## Grafo

Tras cambios: `graphify . --code-only --force` (o `graphify update . --force`) → `graphify-out/` (ignorado por git). Consultar con `graphify query "..."`.
