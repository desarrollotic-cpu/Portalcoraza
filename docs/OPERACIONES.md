# Módulo Operaciones

**Fecha:** 2026-10-05 (antes 2026-09-11)

## Alcance

Operaciones gestiona el **catálogo de puestos** (`posts`), la **supervisión de minutas**, **rondas GPS** y la **consulta de inspecciones de patineta eléctrica** (PESV). Lo consumen:

- **Programación** (cuadro mensual)
- **Dotación** (entrega de elementos a puestos)
- **Minuta Virtual** (cuenta `PUESTO` en app separada; ops consulta/PDF + inspecciones)
- Otros módulos vía `GET /posts`

## Rutas (Portal web)

| Ruta | Permiso | Descripción |
|------|---------|-------------|
| `/operaciones` | `operations.view` | Panel resumen |
| `/operaciones/puestos` | `operations.view` | CRUD de puestos |
| `/operaciones/puestos/fichas` | `operations.view` / `posts.view` | Fichas de puestos |
| `/operaciones/minutas` | `operations.view` | Historial / PDF por puesto + mes; enlace Minuta Web |
| `/operaciones/rondas` | `rondas.view` / `operations.view` | Cumplimiento de rondas GPS |
| `/operaciones/patineta` | `scooter.view` / `operations.view` | Inspecciones preoperacionales de patineta (solo lectura) |

Crear / editar puestos: `posts.create` / `posts.edit`.

**Nota:** Minuta Virtual **no** aparece en el menú principal del Portal. Los vigilantes usan https://portalcoraza-minuta.onrender.com (`apps/minuta-web`). Detalle: [`MINUTA-VIRTUAL.md`](MINUTA-VIRTUAL.md).

## Inspección patineta eléctrica (PESV)

- Flag por puesto: `posts.tiene_patineta_electrica` (checkbox en editar puesto).
- Vigilante diligencia en Minuta (`/patineta`) si su puesto tiene el flag.
- Operaciones consulta listado + detalle en `/operaciones/patineta`.
- API: `GET/POST /api/v1/scooter-inspections` (permisos `scooter.view` / `scooter.create` o `operations.view` / `minuta.create`).
- Migración: `079_scooter_inspections.sql`.
- Spec: [`superpowers/specs/2026-10-05-inspeccion-patineta-electrica-design.md`](superpowers/specs/2026-10-05-inspeccion-patineta-electrica-design.md).

## API

Reutiliza `PostsModule`:

- `GET /posts`
- `POST /posts` (`posts.create`)
- `PATCH /posts/:id` (`posts.edit`) — incluye `tienePatinetaElectrica`

Minutas ops (módulo `minuta`): historial / PDF mensual por puesto.

Scooter: módulo `scooter-inspections` (ver spec).

## Relación con RRHH

Los **centros de trabajo** en RRHH (`/rrhh/admin/centros`) siguen sincronizando a `posts` vía `syncFromWorkCenter`.  
El catálogo operativo principal para Programación vive en **Operaciones → Puestos**.

El formulario de puesto incluye, además de código/nombre/tipo/estado/cliente/dirección/notas: **zona, contacto, teléfono, contrato, servicios/frentes, armamento, requisitos, instrucciones** y **tiene patineta eléctrica**.

## UI

- Layout: `apps/web/src/app/features/operaciones/`
- Menú: `OPERACIONES_NAV` en `portal-nav.ts`
- Patineta: `scooter-inspections-panel/`
- Minutas: `minutas-list/` · Rondas: `rondas-panel/`
